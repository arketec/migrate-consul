import { BaseClient } from './BaseClient'

export class ConsulMigrationClient extends BaseClient {
  public async set(key: string, value: string): Promise<void> {
    await this._client.kv.set(key, value)
    this.output.key = key
    this.output.value = value
  }
  public async delete(key: string): Promise<void> {
    await this._client.kv.delete(key, () => true)
    this.output.key = key
  }
}
