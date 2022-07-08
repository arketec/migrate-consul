import * as consul from 'consul'

import { ILogger, IMigrationClient } from './types/interfaces'

import { Config } from '../util/Config'
import { QueryFactory } from './QueryFactory'

export abstract class BaseClient implements IMigrationClient {
  protected _client: consul.Consul
  protected _config: Config
  protected _factory: QueryFactory
  protected _logger: ILogger
  public output: {
    key: string
    value: string
  }
  public preventMigration: boolean
  constructor(config: Config, logger: ILogger, client?: consul.Consul) {
    this._client =
      client ??
      new consul({
        host: config.consul.host,
        port: config.consul.port.toString(),
        promisify: true,
      })
    this._config = config
    this._factory = new QueryFactory()
    this._logger = logger
    this.output = {
      key: undefined,
      value: undefined,
    }
  }
  public getKey() {
    return this._factory.key
  }
  public async get<T>(key: string): Promise<T> {
    const result = await this._client.kv.get<{ Value: T }>(key)
    if (!result || result.Value === undefined) return undefined
    try {
      this._logger.debug(result, 'consulResult')
      return typeof result?.Value === 'object'
        ? result?.Value
        : (JSON.parse(result.Value?.toString()) as T)
    } catch {
      return result.Value
    }
  }
  public abstract set(key: string, value: string): Promise<void>

  public async setMany(values: { [key: string]: string }): Promise<void> {
    for (const [k, v] of Object.entries(values)) await this.set(k, v)
  }
  public abstract delete(key: string): Promise<void>

  public async deleteMany(keys: string[]): Promise<void> {
    for (const k of keys) await this.delete(k)
  }

  public key(key: string): IMigrationClient {
    this._factory.setKey(key)
    return this
  }
  public val(val: any): IMigrationClient {
    this._factory.setValue(val)
    return this
  }

  public jpath(path: string): IMigrationClient {
    this._factory.setJPath(path)
    return this
  }
  public jsonpath(jsonpath: string): IMigrationClient {
    this._factory.setJsonPath(jsonpath)
    return this
  }
  public callback<T = any>(callback: (value: any) => T): IMigrationClient {
    this._factory.setJsonPathFunc(callback)
    return this
  }

  public async save(): Promise<void> {
    await this._factory.exec(this)
  }
  public async drop(): Promise<void> {
    await this._factory.remove(this)
  }
}
