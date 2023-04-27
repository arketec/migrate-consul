import * as diff from 'diff'

import {
  ModuleKind,
  ModuleResolutionKind,
  ScriptTarget,
  transpileModule,
} from 'typescript'

import { ActionBase } from '../ActionBase'
import { CommonConsulOptions } from '../types/interfaces'
import { DataService } from './../../data/DataService'
import { MongooseAccess } from '../../data/mongo_adapter'
import { MongooseMigrationRepo } from '../../data'
import { ValidationClient } from '../../migrator'
import { requireFromString } from '../../util/require'

import Consul = require('consul')

export class ActionVerify extends ActionBase<VerifyOptions> {
  public filesystem: any
  private connection: MongooseAccess
  constructor(
    loggers: {
      info: (msg: any) => void
      error: (msg: any) => void
      debug: (msg: any, title?: string) => void
    },
    consul?: Consul.Consul
  ) {
    super(
      'verify',
      'Usage: migrate-consul verify [type] [...options]',
      {
        help: 'prints this help menu',
        path: 'path to directory containing the migrations',
        configPath: 'path to directory containing migrate-consul-config.jsonc',
        file: 'path to a specific migration file to verify',
        dateFrom:
          'date of migrations to start verification from. default 1970-01-01',
        dateTo:
          'date of migrations to end verification at (inclusive). default now',
        unstaged:
          'only verify migrations that have not been staged yet. default false',
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
        'migrate-consul verify up --file 20230101123345-my_migration.js',
        'migrate-consul verify up --dateFrom 2023-01-01 --dateTo 2023-01-02',
        'migrate-consul verify up --unstaged',
      ],
      loggers,
      consul
    )
  }

  protected async _executionFunction() {
    const migrationsDir = this.config.migrationsDirectory

    const files = await this.filesystem.listAsync(
      `${this.options.path ?? this.appRoot}/${migrationsDir}/`
    )

    if (this.options.file) {
      const file = this.options.file
      this.loggers.debug(`options.file name ${file}`)
      if (!this._verifyMigration(file, migrationsDir)) {
        this.loggers.info(
          `failed to verify ${file}. run with --debug to see more output`
        )
        return 1
      }
      this.loggers.info(`verified ${file}`)
      return 0
    }
    for (const file of files) {
      const date = parseInt(file.split('-')[0])
      if (this.options.dateFrom) {
        const dateFrom = parseInt(
          this.options.dateFrom.replaceAll('-', '') + '000000'
        )
        if (date < dateFrom) continue
      }
      if (this.options.dateTo) {
        const dateTo = parseInt(
          this.options.dateTo.replaceAll('-', '') + '235959'
        )
        if (date > dateTo) continue
      }
      if (this.options.unstaged) {
        await this.connect()

        const repo = new DataService(new MongooseMigrationRepo())
        if (await repo.hasMigration(file)) continue
      }
      if (!(await this._verifyMigration(file, migrationsDir))) {
        this.loggers.info(
          `failed to verify ${file}. run with --debug to see more output`
        )
        continue
      }
      this.loggers.info(`verified ${file}`)
    }
    await this.disconnect()
    return 0
  }

  private async _verifyMigration(file: string, migrationsDir: string) {
    function getNewMigrator(root: ActionVerify) {
      return new ValidationClient(root.config, root.loggers, root.getConsul())
    }
    const migrator: ValidationClient = getNewMigrator(this)
    const js = await this.filesystem.readAsync(
      `${this.options.path ?? this.appRoot}/${migrationsDir}/${file}`
    )
    if (!js) {
      this.loggers.error(
        `could not find file ${`${
          this.options.path ?? this.appRoot
        }/${migrationsDir}/${file}`}`
      )
      return false
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
    this.loggers.debug(this.options.diff, 'diff option')
    this.loggers.debug(migrator.output, 'output')
    this.loggers.debug(migrator.output?.key, 'output.key')
    if (this.options.diff && migrator.output && migrator.output.key) {
      const currentValue = await migrator.get<string>(migrator.output.key)
      const stringifiedCurrentValue = currentValue
        ? typeof currentValue === 'object'
          ? JSON.stringify(currentValue, null, 2)
          : currentValue.toString()
        : ''
      const stringifiedNewValue = migrator.output.value
        ? typeof migrator.output.value === 'object'
          ? JSON.stringify(migrator.output.value, null, 2)
          : migrator.output.value.toString()
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

    return true
  }
  private async connect() {
    if (!this.connection)
      this.connection = await new MongooseAccess().connect(this.configRoot)
  }
  private async disconnect() {
    if (this.connection) await this.connection.disconnect()
  }
}

export interface VerifyOptions extends CommonConsulOptions {
  diff: string
  file: string
  dateFrom: string
  dateTo: string
  unstaged: boolean
}
