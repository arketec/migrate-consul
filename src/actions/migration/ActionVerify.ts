import * as diff from 'diff'

import {
  ModuleKind,
  ModuleResolutionKind,
  ScriptTarget,
  transpileModule,
} from 'typescript'

import { ActionDBBase } from '../ActionDBBase'
import { CommonConsulOptions } from '../types/interfaces'
import { IRepo } from '../../data'
import { ValidationClient } from '../../migrator'
import { requireFromString } from '../../util/require'

import Consul = require('consul')

export class ActionVerify extends ActionDBBase<VerifyOptions> {
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
      'verify',
      'Usage: migrate-consul verify [type] [...options]',
      {
        help: 'prints this help menu',
        path: 'path to directory containing the migrations',
        configPath: 'path to directory containing migrate-consul-config.jsonc',
        diff: 'prints the diff from the migration output and the current consul value',
        token: `consul ACL token if not in the environment variable provided in the config`,
        debug: 'print debug info while running',
      },
      [
        'migrate-consul verify',
        'migrate-consul verify up',
        'migrate-consul verify --diff',
        'migrate-consul verify up  --diff char',
        'migrate-consul verify down --diff json',
      ],
      loggers,
      consul,
      repo
    )
  }

  protected async _executionFunction() {
    this.getService()
    function getNewMigrator(root: ActionVerify) {
      return new ValidationClient(root.config, root.loggers, root.getConsul())
    }
    const migrationsDir = this.config.migrationsDirectory
    let migrator: ValidationClient
    const files = await this.filesystem.listAsync(
      `${this.options.path ?? this.appRoot}/${migrationsDir}/`
    )
    for (const file of files) {
      const hasCompletedMigration = await this.service.hasMigration(file, 2)
      if (hasCompletedMigration) continue
      const js = await this.filesystem.readAsync(
        `${this.options.path ?? this.appRoot}/${migrationsDir}/${file}`
      )
      if (!js) {
        this.loggers.error(
          `could not find file ${`${
            this.options.path ?? this.appRoot
          }/${migrationsDir}/${file}`}`
        )
        continue
      }
      this.loggers.debug(js, `js file ${file}`)
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
      migrator = getNewMigrator(this)
      if (this.parameters.first !== 'down') {
        await script.up(
          migrator,
          this.config.environment,
          this.getConsul(),
          this.loggers.debug
        )
      } else {
        await script.down(
          migrator,
          this.config.environment,
          this.getConsul(),
          this.loggers.debug
        )
      }
      if (this.options.diff) {
        const currentValue = await migrator.get<string>(migrator.output.key)
        const stringifiedCurrentValue = currentValue
          ? typeof currentValue === 'object'
            ? JSON.stringify(currentValue, null, 2)
            : currentValue
          : ''
        const stringifiedNewValue = migrator.output.value
          ? typeof migrator.output.value === 'object'
            ? JSON.stringify(migrator.output.value, null, 2)
            : migrator.output.value
          : ''
        this.loggers.debug(
          currentValue,
          `currentValue (type: ${typeof currentValue})`
        )
        this.loggers.debug(
          migrator.output.value,
          `newValue (type: ${typeof migrator.output.value})`
        )
        let difference
        switch (this.options.diff) {
          case 'lines':
          case 'line':
            if (
              stringifiedCurrentValue.length > this.config.diff.maxDiffLength ||
              stringifiedNewValue.length > this.config.diff.maxDiffLength
            ) {
              this.loggers.error(
                'value too large for line diff, please use "--diff patch" for large files'
              )
              return 1
            }
            difference = diff.diffLines(
              stringifiedCurrentValue,
              stringifiedNewValue
            )
            break
          case 'json':
            difference = diff.diffJson(
              stringifiedCurrentValue,
              stringifiedNewValue
            )
            break
          case 'words':
          case 'word':
            if (
              stringifiedCurrentValue.length > this.config.diff.maxDiffLength ||
              stringifiedNewValue.length > this.config.diff.maxDiffLength
            ) {
              this.loggers.error(
                'value too large for words diff, please use "--diff patch" for large files'
              )
              return 1
            }
            difference = diff.diffWords(
              stringifiedCurrentValue,
              stringifiedNewValue
            )
            break
          case 'char':
          case 'chars':
            if (
              stringifiedCurrentValue.length > this.config.diff.maxDiffLength ||
              stringifiedNewValue.length > this.config.diff.maxDiffLength
            ) {
              this.loggers.error(
                'value too large for char diff, please use "--diff patch" for large files'
              )
              return 1
            }
            difference = diff.diffChars(
              stringifiedCurrentValue,
              stringifiedNewValue
            )
            break
          case 'patch':
          default:
            this.options.diff = 'patch'
            difference = diff.createPatch(
              file,
              stringifiedCurrentValue,
              stringifiedNewValue
            )
            break
        }
        require('colors')
        this.loggers.info(
          '----------------------------Diff---------------------------'[
            this.config.diff.colors.bg
          ]
        )
        if (this.options.diff == 'patch') this.loggers.info(difference)
        else
          difference.forEach((part) => {
            const color = part.added
              ? this.config.diff.colors.added
              : part.removed
              ? this.config.diff.colors.removed
              : this.config.diff.colors.unchanged
            process.stderr.write(part.value[color])
          })
        process.stderr.write('\n')
        this.loggers.info(
          '----------------------------End diff---------------------------'[
            this.config.diff.colors.bg
          ]
        )
      }

      this.loggers.info(`verified ${file}`)
    }
    return 0
  }
}

export interface VerifyOptions extends CommonConsulOptions {
  diff: string
}
