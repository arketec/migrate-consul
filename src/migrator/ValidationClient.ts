import { BaseClient } from './BaseClient'

export class ValidationClient extends BaseClient {
  public async set(key: string, value: string): Promise<void> {
    this._logger.info(`Set Key: ${key}`)
    this._logger.info(`Value: ${value}`)
    this.output.key = key
    this.output.value = value?.toString() ?? ''
  }
  public async delete(key: string): Promise<void> {
    this._logger.info(`Delete Key: ${key}`)
    this.output.key = key
  }
}
