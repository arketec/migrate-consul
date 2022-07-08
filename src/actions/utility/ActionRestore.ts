import { ActionDBBase } from '../ActionDBBase'
import { CommonConsulOptions } from '../types/interfaces'
import { ConsulMigrationClient } from '../../migrator'
import { IRepo } from '../../data'
import Consul = require('consul')

export class ActionRestore extends ActionDBBase<CommonConsulOptions> {
  public prompt: any
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
      'restore',
      'Usage: migrate-consul restore [key] [...options]',
      {
        help: 'prints this help menu',
        path: 'path to directory containing the migrations',
        configPath: 'path to directory containing migrate-consul-config.jsonc',
        date: 'date to restore',
        list: 'lists the backups for the provided key',
        last: 'restore the last value for the provided key, otherwise user will choose from prompt',
        token: `consul ACL token if not in the environment variable provided in the config`,
        debug: 'print debug info while running',
      },
      [
        'migrate-consul restore sample/path/to/key',
        'migrate-consul restore sample/path/to/key --last',
      ],
      loggers,
      consul,
      repo
    )
  }

  protected async _executionFunction() {
    const key = this.parameters.first
    if (!key || !key.length) {
      this.loggers.error(
        `key is a required parameter. please run 'migrate-consul restore --help' for more info`
      )
      return 1
    }
    this.getService()
    const migrator = new ConsulMigrationClient(
      this.config,
      this.loggers,
      this.getConsul()
    )

    if (this.options.last) {
      const value = await this.service.restore(key)
      this.loggers.debug(value, 'restore value')
      await migrator.set(key, value)
    } else {
      const migrations = await this.service.findBackups(key)

      const backups = Array.from(
        new Set(migrations.map((m) => m.date.toISOString()).reverse())
      )
      if (this.options.list) {
        backups.forEach(this.loggers.info)
        return 0
      }
      const migrationInfo = this.options.date
        ? { date: this.options.date }
        : await this.prompt.ask([
            {
              message: 'choose migration to restore: ',
              name: 'date',
              type: 'select',
              choices: backups,
            },
          ])
      const value = await this.service.restore(
        key,
        new Date(migrationInfo.date)
      )
      this.loggers.debug(value, 'restore value')
      await migrator.set(key, value)
      this.loggers.info(`restored backup of ${key} from ${migrationInfo.date}`)
    }
    return 0
  }
}

export interface RestoreOptions extends CommonConsulOptions {
  date: string
  list: boolean
  last: boolean
}
