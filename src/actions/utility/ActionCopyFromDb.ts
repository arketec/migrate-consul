import { ActionDBBase } from '../ActionDBBase'
import { CommonConsulOptions } from '../types/interfaces'
import { DataService, IRepo, MongooseMigrationRepo } from '../../data'
import Consul = require('consul')
import { ConsulMigrationRepo } from '../../data/repo/ConsulMigrationRepo'

export class ActionCopyFromDb extends ActionDBBase<CommonConsulOptions> {
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
      'convert-migrations',
      'Copies migration data from mongodb to consul for v4\nUsage: migrate-consul convert-migrations [...options]',
      {
        help: 'prints this help menu',
        path: 'path to directory containing the migrations',
        configPath: 'path to directory containing migrate-consul-config.jsonc',
        token: `consul ACL token if not in the environment variable provided in the config`,
        debug: 'print debug info while running',
      },
      ['migrate-consul convert-migrations'],
      loggers,
      consul,
      repo
    )
  }

  protected async _executionFunction() {
    try {
      const mongoService = new DataService(new MongooseMigrationRepo())
      const consulService = new DataService(
        new ConsulMigrationRepo(this.consul)
      )
      await consulService.saveAll(await mongoService.getAll())
      return 0
    } catch (e: any) {
      this.loggers.error(e.message)
      return 1
    }
  }
}
