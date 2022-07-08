import { ActionDBBase } from '../ActionDBBase'
import { CommonConsulOptions } from '../types/interfaces'
import { ConsulMigrationClient } from '../../migrator'
import { IRepo } from '../../data'
import Consul = require('consul')

export class ActionBackup extends ActionDBBase<CommonConsulOptions> {
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
      'backup',
      'Usage: migrate-consul backup [key] [...options]',
      {
        help: 'prints this help menu',
        path: 'path to directory containing the migrations',
        configPath: 'path to directory containing migrate-consul-config.jsonc',
        token: `consul ACL token if not in the environment variable provided in the config`,
        debug: 'print debug info while running',
      },
      ['migrate-consul backup sample/path/to/key'],
      loggers,
      consul,
      repo
    )
  }

  protected async _executionFunction() {
    const keys = this.parameters.array
    this.getService()
    const migrator = new ConsulMigrationClient(
      this.config,
      this.loggers,
      this.getConsul()
    )

    for (const key of keys.flatMap((k) => k.split(/[\s,]/))) {
      const value = await migrator.get(key)
      if (value) {
        this.loggers.debug(value, 'backup value')
        await this.service.backup(
          key,
          typeof value === 'object' ? JSON.stringify(value) : value.toString()
        )
        this.loggers.info(`backup created for key ${key}`)
      } else {
        this.loggers.error(`value not found for key ${key}`)
        return 1
      }
    }
    return 0
  }
}
