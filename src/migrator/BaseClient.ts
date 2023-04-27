import * as consul from 'consul'

import { ILogger, IMigrationClient } from './types/interfaces'

import { Config } from '../util/Config'
import { QueryFactory } from './QueryFactory'

export abstract class BaseClient implements IMigrationClient {
  protected _client: consul.Consul
  protected _config: Config
  protected _factory: QueryFactory
  protected _logger: ILogger
  private _callback: (result: any) => void
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
        defaults: config.consul.acl
          ? {
              token:
                config.consul.aclToken ??
                process.env[config.consul.aclTokenEnvVar],
            }
          : undefined,
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
    this._factory = new QueryFactory()
    this._factory.setKey(key)
    return this
  }
  public val(val: any): IMigrationClient {
    if (typeof val === 'function') {
      this._factory.setJsonPathFunc(val)
    } else {
      this._factory.setAndAddValue(val)
    }
    return this
  }
  public remove(): IMigrationClient {
    this._factory.addDelete()
    return this
  }
  public jpath(path: string): IMigrationClient {
    this._logger.info(
      `jpath is deprecated and will be removed in a future version, use jsonpath instead`
    )
    this._factory.setJPath(path)
    return this
  }
  public jsonpath(jsonpath: string): IMigrationClient {
    this._factory.addJsonPath(jsonpath)
    return this
  }
  public callback<T = any>(callback: (value: T) => void): IMigrationClient {
    this._callback = callback
    return this
  }
  public splice(val: any, index?: number): IMigrationClient {
    this._factory.splice(val, index)
    return this
  }
  public push(val: any): IMigrationClient {
    this._factory.push(val)
    return this
  }
  public pop(): IMigrationClient {
    this._factory.pop()
    return this
  }
  public async save(): Promise<void> {
    await this._factory.exec(this)
    if (this._callback) this._callback(this.output.value)
  }
  public async drop(): Promise<void> {
    await this._factory.remove(this)
    if (this._callback) this._callback(this.output.value)
  }
}
