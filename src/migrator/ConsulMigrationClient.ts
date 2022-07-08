import { BaseClient } from './BaseClient'

export class ConsulMigrationClient extends BaseClient {
  public async set(key: string, value: string): Promise<void> {
    await this._client.kv.set(key, value.toString())
    this.output.key = key
    this.output.value = value
  }
  public async delete(key: string): Promise<void> {
    await new Promise((resolve) =>
      this._client.kv.delete(key, () => resolve(undefined))
    )
    this.output.key = key
  }
}
