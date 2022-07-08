import '../polyfills'
import { Config, Filesystem } from '../util/Config'

import { CommandHelp } from '../util/CommandHelp'

import Consul = require('consul')

export abstract class ActionBase<TOptions> {
  public name: string
  public description: string
  public parameters: {
    first: string
    second: string
    third: string
    array: string[]
  }
  public options: any
  public config: Config
  public appRoot: string

  protected consul: Consul.Consul
  protected configRoot: string
  protected helpMenu: CommandHelp<TOptions>
  protected loggers: {
    info: (msg: any) => void
    error: (msg: any) => void
    debug: (msg: any, title?: string) => void
  }

  private _token: string
  private static _debug: boolean

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
    consul?: Consul.Consul
  ) {
    this.name = name
    this.description = description
    this.helpMenu = new CommandHelp(name, description, options, ...examples)

    ActionBase<TOptions>._debug = false

    this.loggers = {
      info: loggers.info,
      error: loggers.error,
      debug: (msg: any, title: string) =>
        this.maybeDebug(loggers.debug, msg, title),
    }
    if (consul) this.consul = consul
  }

  public setParameters(parameters: any) {
    this.loggers.debug(parameters, 'parameters')
    this.parameters = {
      first: parameters.first,
      second: parameters.second,
      third: parameters.third,
      array: parameters.array,
    }
  }
  public async loadConfig(filesystem: Filesystem): Promise<void> {
    try {
      this.config = await Config.load(
        filesystem,
        `${this.configRoot}/migrate-consul-config.jsonc`
      )
      if (!ActionBase<TOptions>._debug)
        ActionBase<TOptions>._debug = this.config.debug
      this.loggers.debug(this.config, 'config')
    } catch (e: any) {
      this.loggers.error(e.message)
      process.exit(1)
    }
  }

  public handleCommonOptions(parameters: any): void {
    const options = parameters.options

    const validationError = this.helpMenu.validate(options)
    if (validationError) {
      this.loggers.error(validationError)
      process.exit()
    }
    if (options.help) {
      this.helpMenu.print(this.loggers)
      process.exit()
    }
    this.configRoot = options.configPath ?? this.appRoot
    this.options = options
    if (options.token) {
      this._token = options.token
    }
    if (options.debug) {
      ActionBase<TOptions>._debug = true
    }
  }

  public getConsul() {
    if (!this.consul)
      this.consul = Consul({
        host: this.config.consul.host,
        port: this.config.consul.port.toString(),
        secure: this.config.consul.secure,
        promisify: true,
        defaults:
          this.config.consul.acl || this._token
            ? {
                token:
                  this._token ?? process.env[this.config.consul.aclTokenEnvVar],
              }
            : undefined,
      })
    return this.consul
  }

  protected abstract _executionFunction(): Promise<0 | 1>
  public async exec(exit?: boolean) {
    if (exit === undefined) exit = true
    let exitCode = 0

    try {
      exitCode = await this._executionFunction()
    } catch (e: any) {
      this.loggers.error(e.message)
      exitCode = 1
    } finally {
      if (exit) process.exit(exitCode)
    }
  }

  protected maybeDebug(
    debugFunc: (m: string, t?: string) => void,
    msg: any,
    title?: string
  ) {
    if (ActionBase<TOptions>._debug) debugFunc(msg, title)
  }
}
