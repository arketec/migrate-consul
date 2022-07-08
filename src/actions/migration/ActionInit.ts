import { ActionBase } from '../ActionBase'
import { CommonOptions } from '../types/interfaces'
import { nowAsString } from '../../util/DateFormatter'

export class ActionInit extends ActionBase<CommonOptions> {
  public generate: any
  public filesystem: any
  public prompt: any
  constructor(loggers: {
    info: (msg: any) => void
    error: (msg: any) => void
    debug: (msg: any, title?: string) => void
  }) {
    super(
      'init',
      'Usage: migrate-consul init [path] [migrationsDirectoryName]',
      {
        help: 'prints this help menu',
        path: 'path to directory containing the migrations',
        configPath: 'path to directory containing migrate-consul-config.jsonc',
        debug: 'print debug info while running',
      },
      [
        'migrate-consul init',
        'migrate-consul init /home/me/myMigrations',
        'migrate-consul init /home/me/myMigrations customMigrationFolder',
      ],
      loggers
    )
  }

  protected async _executionFunction() {
    const rootPath = this.parameters.first
      ? { rootPath: this.parameters.first }
      : await this.prompt.ask({
          message: 'path: ',
          name: 'rootPath',
          type: 'text',
          initial: process.cwd(),
        })
    if (!rootPath || !rootPath.rootPath) {
      this.loggers.error(`no root path found`)
      return 1
    }
    const migrationDir = this.parameters.second
      ? { migrationsDirName: this.parameters.second }
      : await this.prompt.ask({
          message: 'Name of the migrations directory: ',
          name: 'migrationsDirName',
          type: 'text',
          initial: `migrations`,
        })
    if (!migrationDir || !migrationDir.migrationsDirName) {
      this.loggers.error(`no migration directory found`)
      return 1
    }
    if (
      !(await this.filesystem.existsAsync(
        `${rootPath.rootPath}/${migrationDir.migrationsDirName}`
      ))
    ) {
      await this.generate({
        template: 'migration.ts.ejs',
        target: `${rootPath.rootPath}/${
          migrationDir.migrationsDirName
        }/${nowAsString()}-sample.ts`,
        props: {
          key: 'sample',
          value: 'Hello from migrate-consul',
          showExamples: true,
          includeTypes: true,
          types: [],
          isSample: true,
        },
      })
    }
    if (!(await this.filesystem.existsAsync(`${rootPath.rootPath}/types`))) {
      await this.generate({
        template: 'types.ts.ejs',
        target: `${rootPath.rootPath}/types/types.ts`,
      })
    }
    const configFile = `${rootPath.rootPath}/migrate-consul-config.jsonc`
    if (!(await this.filesystem.existsAsync(configFile)))
      await this.generate({
        template: 'config.json.ejs',
        target: configFile,
        props: {
          useMongo: true,
          mongoHost: 'localhost',
          mongoPort: 27017,
          dbName: 'consul_migrations',
          consulHost: 'localhost',
          consulPort: 8500,
          consulSecure: false,
          useAcl: false,
          aclTokenEnvVar: null,
          migrationsDirectory: migrationDir.migrationsDirName,
          environment: 'local',
          printSamples: true,
          generateTypesFromKeys: false,
          maxDiffLength: 10000,
          colors: {
            bg: 'bgCyan',
            added: 'green',
            removed: 'red',
            unchanged: 'grey',
          },
          includeTypes: true,
        },
      })
    else this.loggers.info('config file already exists')

    this.loggers.info(`Edit the generated config file at ${configFile}`)

    return 0
  }
}
