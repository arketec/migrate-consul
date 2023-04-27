import {
  ModuleKind,
  ModuleResolutionKind,
  ScriptTarget,
  transpileModule,
} from 'typescript'

import { ActionDBBase } from '../ActionDBBase'
import { CommonConsulOptions } from '../types/interfaces'
import { ConsulMigrationClient } from '../../migrator'
import { IRepo } from '../../data'
import { createHash } from 'crypto'
import { requireFromString } from '../../util/require'

import Consul = require('consul')
import stageFromFilesystem from '../common/stage'

export class ActionUp extends ActionDBBase<UpOptions> {
  public filesystem: any
  constructor(
    loggers: {
      info: (msg: any) => void
      error: (msg: any) => void
      debug: (msg: any, title?: string) => void
    },
    consul?: Consul.Consul,
    repo?: IRepo
  ) {
    super(
      'up',
      'Usage: migrate-consul up [...options]',
      {
        help: 'prints this help menu',
        path: 'path to directory containing the migrations',
        configPath: 'path to directory containing migrate-consul-config.jsonc',
        stage: "stage any un-staged migrations before running 'up'",
        force: "force migration to run even if hash doesn't match",
        token: `consul ACL token if not in the environment variable provided in the config`,
        debug: 'print debug info while running',
      },
      [
        'migrate-consul up',
        'migrate-consul up --force',
        'migrate-consul up --stage myUserName',
      ],
      loggers,
      consul,
      repo
    )
  }

  protected async _executionFunction() {
    this.getService()

    if (this.options.stage)
      await stageFromFilesystem(
        this.service,
        this.loggers,
        this.filesystem,
        `${this.options.path ?? this.appRoot}/${
          this.config.migrationsDirectory
        }/`,
        typeof this.options.stage === 'string' ? this.options.stage : undefined
      )

    const migrator = new ConsulMigrationClient(
      this.config,
      this.loggers,
      this.getConsul()
    )
    const migrationsDir = this.config.migrationsDirectory

    const migrationsToRun = await this.service.find(0)

    for (const migration of migrationsToRun) {
      const js = await this.filesystem.readAsync(
        `${this.options.path ?? this.appRoot}/${migrationsDir}/${
          migration.name
        }`
      )
      if (!js) {
        this.loggers.error(
          `could not find file ${`${
            this.options.path ?? this.appRoot
          }/${migrationsDir}/${migration.name}`}`
        )
        continue
      }
      const hashFunc = createHash('sha1')
      const hash = hashFunc.update(js).digest('base64')
      if (hash !== migration.hash) {
        this.loggers.error(
          `hash does not match for file: '${migration.name}'. Was the file changed?`
        )
        if (!this.options.force) continue
      }

      this.loggers.debug(js, `js file ${migration.name}`)
      const output = transpileModule(js, {
        compilerOptions: {
          module: ModuleKind.CommonJS,
          moduleResolution: ModuleResolutionKind.NodeJs,
          target: ScriptTarget.ES2019,
          allowJs: true,
          strict: false,
          skipDefaultLibCheck: true,
          skipLibCheck: true,
        },
      }).outputText
      this.loggers.debug(output, 'tsc output')
      const script = requireFromString(output, 'script').default
      try {
        await script.up(
          migrator,
          this.config.environment,
          this.getConsul(),
          this.loggers.debug
        )
        await this.service.save({ ...migration, status: 2 })
      } catch (e: any) {
        await this.service.save({ ...migration, status: 1 })
        throw e
      }
      this.loggers.info(`migrated up ${migration.name}`)
    }
    return 0 as 0 | 1
  }
}

export interface UpOptions extends CommonConsulOptions {
  force: boolean
}
