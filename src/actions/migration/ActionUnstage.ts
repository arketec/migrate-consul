import { ActionDBBase } from '../ActionDBBase'
import { CommonOptions } from '../types/interfaces'

export class ActionUnstage extends ActionDBBase<UnstageOptions> {
  constructor(loggers: {
    info: (msg: any) => void
    error: (msg: any) => void
    debug: (msg: any, title?: string) => void
  }) {
    super(
      'unstage',
      'Usage: migrate-consul unstage [...options]',
      {
        help: 'prints this help menu',
        path: 'path to directory containing the migrations',
        configPath: 'path to directory containing migrate-consul-config.jsonc',
        file: 'unstage file with provided name, otherwise will unstage last staged',
        failed: `unstage all failed migrations`,
        pending: 'unstage all pending migrations',
        author: 'unstage all non-completed migrations from provided author',
        debug: 'print debug info while running',
      },
      [
        'migrate-consul unstage --file 2022060112344-my_migration.ts',
        'migrate-consul unstage --failed',
        'migrate-consul unstage --pending',
        'migrate-consul unstage --author',
      ],
      loggers
    )
  }

  protected async _executionFunction() {
    await this.getService()
    if (this.options.failed) {
      for (const file of await this.service.find(1)) {
        await this.service.delete(file.name)
        this.loggers.info(`unstaged ${file.name}`)
      }
    }
    if (this.options.pending) {
      for (const file of await this.service.find(0)) {
        await this.service.delete(file.name)
        this.loggers.info(`unstaged ${file.name}`)
      }
    }
    if (this.options.author) {
      for (const file of await this.service.findByAuthor(this.options.author)) {
        await this.service.delete(file.name)
        this.loggers.info(`unstaged ${file.name}`)
      }
    }
    if (this.options.file) {
      await this.service.delete(this.options.file)
      this.loggers.info(`unstaged ${this.options.file}`)
    } else {
      const migrations = await this.service.getAll()
      await this.service.delete(migrations.at(-1).name)
      this.loggers.info(`unstaged ${migrations.at(-1).name}`)
    }

    return 0 as 0 | 1
  }
}

export interface UnstageOptions extends CommonOptions {
  file: string
  failed: boolean
  pending: boolean
}
