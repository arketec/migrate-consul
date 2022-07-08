import { ActionDBBase } from '../ActionDBBase'
import { CommonOptions } from '../types/interfaces'
import { createHash } from 'crypto'

export class ActionStage extends ActionDBBase<StageOptions> {
  public filesystem: any

  constructor(loggers: {
    info: (msg: any) => void
    error: (msg: any) => void
    debug: (msg: any, title?: string) => void
  }) {
    super(
      'stage',
      'Usage: migrate-consul stage [...options]',
      {
        help: 'prints this help menu',
        path: 'path to directory containing the migrations',
        configPath: 'path to directory containing migrate-consul-config.jsonc',
        author: `author of script`,
        debug: 'print debug info while running',
      },
      ['migrate-consul stage --author myName'],
      loggers
    )
  }

  protected async _executionFunction() {
    await this.getService()
    const migrationsDir = this.config.migrationsDirectory
    const files = await this.filesystem.listAsync(
      `${this.options.path ?? this.appRoot}/${migrationsDir}/`
    )
    for (const file of files) {
      if (file.endsWith('-sample.ts')) {
        this.loggers.info(
          `skipping sample migration file, ${file}. If this is a mistake, please end filename with something other than -sample.ts`
        )
        continue
      }
      const hasMigration = await this.service.hasMigration(file)

      if (!hasMigration) {
        const now = new Date()
        const content = await this.filesystem.readAsync(
          `${this.options.path ?? this.appRoot}/${migrationsDir}/${file}`
        )
        if (!content) {
          this.loggers.error(`content not found for file ${file}`)
          return 1
        }
        const hashFunc = createHash('sha1')
        await this.service.save({
          name: file,
          date_added: now,
          status: 0,
          hash: hashFunc.update(content).digest('base64'),
          script_author: this.options.author,
        })

        this.loggers.info(`staged migration ${file}`)
      }
    }

    return 0
  }
}

export interface StageOptions extends CommonOptions {
  author: string
}
