import * as jp from 'jsonpath'

import { IMigrationClient } from './types'
import { JSONHelper } from './../util/JSONHelper'

export class QueryFactory {
  public key: string
  private _jpath: string
  private _jsonpath: string
  private _jsonpathFunc: (value: any) => any
  private _all_jpaths: string[]
  private _value: any
  private _all_values: string[]
  private _isJson: boolean
  private _isValueArray: boolean

  constructor() {
    this.key = null
    this._jpath = null
    this._jsonpath = null
    this._jsonpathFunc = null
    this._all_jpaths = []
    this._value = null
    this._all_values = []
    this._isJson = false
    this._isValueArray = false
  }

  private reset() {
    this.key = null
    this._jpath = null
    this._jsonpath = null
    this._all_jpaths = []
    this._value = null
    this._all_values = []
    this._isJson = false
    this._isValueArray = false
  }

  public setKey(k: string): void {
    this.key = k
  }

  public setJPath(path: string): void {
    this._isJson = true
    this._jpath = path
    this._all_jpaths.push(this._jpath)
  }

  public setJsonPath(path: string): void {
    this._isJson = true
    this._jsonpath = path
  }

  public setJsonPathFunc(func: (value: any) => any): void {
    this._jsonpathFunc = func
  }

  public setValue(v: any): void {
    this._value = this.tryParseJson(v)
    this._all_values.push(this._value)
    this._isValueArray = this._isJson && v.length
  }

  public async exec(consul: IMigrationClient): Promise<void> {
    if (this._isJson) {
      const result = await consul.get<string>(this.key)
      const parsed = typeof result === 'string' ? JSON.parse(result) : result
      if (!parsed) {
        throw new Error('Current value is not a json object')
      }
      if (this._jsonpath) {
        jp.apply(
          parsed,
          this._jsonpath,
          this._jsonpathFunc ?? (() => this._value)
        )
        return consul.set(this.key, JSON.stringify(parsed, null, 2))
      } else {
        const helper = new JSONHelper(result)

        for (const i in this._all_jpaths) {
          helper.setJPathValue(this._all_jpaths[i], this._all_values[i])
        }

        return consul.set(this.key, helper.toString(true))
      }
    } else {
      return consul.set(this.key, this._value)
    }
  }

  public async push(consul: IMigrationClient): Promise<void> {
    if (this._isJson && this._isValueArray) {
      const result = await consul.get<string>(this.key)
      const parsed = typeof result === 'string' ? JSON.parse(result) : result
      if (!parsed) {
        throw new Error('Current value is not a json object')
      }
      const helper = new JSONHelper(result)

      for (const i in this._all_jpaths) {
        helper.pushJPathValue(this._all_jpaths[i], this._all_values[i])
      }

      await consul.set(this.key, helper.toString(true))
    } else {
      throw new Error('Can only push to JSON array keys')
    }
    this.reset()
  }

  public async remove(consul: IMigrationClient): Promise<void> {
    if (this._isJson) {
      const result = await consul.get<string>(this.key)
      const parsed = typeof result === 'string' ? JSON.parse(result) : result
      if (!parsed) {
        throw new Error('Current value is not a json object')
      }
      if (this._jsonpath) {
        jp.apply(
          parsed,
          this._jsonpath,
          this._jsonpathFunc ?? (() => this._value)
        )
        return consul.set(this.key, JSON.stringify(parsed, null, 2))
      } else {
        const helper = new JSONHelper(result)
        for (const i in this._all_jpaths) {
          helper.removeJPath(this._all_jpaths[i])
        }
        await consul.set(this.key, helper.toString(true))
      }
    } else {
      await consul.delete(this.key)
    }
    this.reset()
  }

  private tryParseJson(s: string) {
    try {
      return JSON.parse(s)
    } catch {
      return s
    }
  }
}
