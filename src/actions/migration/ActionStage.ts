import { ActionDBBase } from '../ActionDBBase'
import stageFromFilesystem from '../common/stage'
import { CommonOptions } from '../types/interfaces'

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
    return await stageFromFilesystem(
      this.service,
      this.loggers,
      this.filesystem,
      `${this.options.path ?? this.appRoot}/${migrationsDir}/`,
      this.options.author
    )
  }
}

export interface StageOptions extends CommonOptions {
  author: string
}
