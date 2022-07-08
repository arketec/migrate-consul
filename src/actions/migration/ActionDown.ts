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

export class ActionDown extends ActionDBBase<DownOptions> {
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
      'down',
      'Usage: migrate-consul down [...options]',
      {
        help: 'prints this help menu',
        path: 'path to directory containing the migrations',
        configPath: 'path to directory containing migrate-consul-config.jsonc',
        last: 'number of migrations to run down, starting with the most recent. default 1',
        force: "force migration to run even if hash doesn't match",
        token: `consul ACL token if not in the environment variable provided in the config`,
        debug: 'print debug info while running',
      },
      [
        'migrate-consul down',
        'migrate-consul down --force',
        'migrate-consul down --last 1',
        'migrate-consul down --last 3',
      ],
      loggers,
      consul,
      repo
    )
  }

  protected async _executionFunction() {
    this.getService()
    let migrator
    const tryParseInt = (s: string, d: number) => {
      try {
        if (typeof s !== 'string') return d
        if (s === '0') return d
        return parseInt(s)
      } catch {
        return d
      }
    }
    const countDown = this.options.last ? tryParseInt(this.options.last, 1) : 1
    const migrationsToRun = await this.service.find(2)
    const migrationsDir = this.config.migrationsDirectory
    for (let i = countDown; i > 0; i--) {
      migrator = new ConsulMigrationClient(
        this.config,
        this.loggers,
        this.getConsul()
      )
      const migration = migrationsToRun.at(-i)
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
      this.loggers.debug(js, `js file ${migration.name}`)
      const hashFunc = createHash('sha1')
      const hash = hashFunc.update(js).digest('base64')
      if (hash !== migration.hash) {
        this.loggers.error(
          `hash does not match for file: '${migration.name}'. Was the file changed?`
        )
        if (!this.options.force) return 1
      }

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
        await script.down(migrator, this.config.environment, this.getConsul())
        await this.service.save({ ...migration, status: 0 })
      } catch (e: any) {
        await this.service.save({ ...migration, status: 1 })
        throw e
      }

      this.loggers.info(`migrated down ${migration.name}`)
    }
    return 0
  }
}

export interface DownOptions extends CommonConsulOptions {
  last: string
  force: boolean
}
