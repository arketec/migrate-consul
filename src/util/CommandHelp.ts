export class CommandHelp<TOptions> {
  private _options: TOptions
  private _name: string
  private _desc: string
  private _examples?: string[]

  constructor(
    name: string,
    desc: string,
    options: TOptions,
    ...examples: string[]
  ) {
    this._options = options
    this._name = name
    this._desc = desc
    this._examples = examples
  }

  public validate(options: any): string | undefined {
    if (!options) return
    if (options) {
      for (const key of Object.keys(options)) {
        if (!Object.keys(this._options).includes(key))
          return `The option '--${key}' does not appear on command '${this._name}'. Please run 'migrate-consul ${this._name} --help' to see a list of options`
      }
    }
  }

  public print(logger: { info: (msg: any) => void }): void {
    logger.info(`${this._name}`)
    logger.info(`${this._desc}`)
    logger.info(`options:`)
    for (const [key, value] of Object.entries(this._options)) {
      logger.info(`     --${key}       ${value}`)
    }
    if (this._examples && this._examples.length) {
      logger.info(``)
      logger.info(`examples:`)
      this._examples.forEach((example) => logger.info(`${example}`))
    }
  }
}
