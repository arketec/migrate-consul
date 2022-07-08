import { DataService, IRepo, MongooseMigrationRepo } from '../data'

import { ActionBase } from './ActionBase'
import { MongooseAccess } from '../data/mongo_adapter'

import Consul = require('consul')

export abstract class ActionDBBase<TOptions> extends ActionBase<TOptions> {
  protected connection: MongooseAccess
  protected repo: IRepo
  protected service: DataService

  constructor(
    name: string,
    description: string,
    options: any,
    examples: string[],
    loggers: {
      info: (msg: any) => void
      error: (msg: any) => void
      debug: (msg: any, title?: string) => void
    },
    consul?: Consul.Consul,
    repo?: IRepo
  ) {
    super(name, description, options, examples, loggers, consul)
    if (repo) this.repo = repo
  }

  public async connect() {
    if (!this.connection)
      this.connection = await new MongooseAccess().connect(this.configRoot)
  }
  public async disconnect() {
    if (this.connection) await this.connection.disconnect()
  }

  protected getService() {
    if (!this.repo) this.repo = new MongooseMigrationRepo()
    this.service = new DataService(this.repo)
    return this.service
  }

  public async exec(exit?: boolean) {
    if (exit === undefined) exit = true
    let exitCode = 0
    await this.connect()

    try {
      exitCode = await this._executionFunction()
    } catch (e: any) {
      this.loggers.error(e.message)
      exitCode = 1
    } finally {
      await this.disconnect()
      if (exit) process.exit(exitCode)
    }
  }
}
