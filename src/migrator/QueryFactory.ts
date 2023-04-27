import * as jp from 'jsonpath'

import { IMigrationClient } from './types'
import { JSONHelper } from './../util/JSONHelper'

export class QueryFactory {
  public key: string
  private _jpath: string
  private _all_jsonpaths: string[]
  private _jsonpathFunc: (value: any) => any
  private _all_jsonpathFuncs: ((value: any) => any)[]
  private _all_jpaths: string[]
  private _value: any
  private _all_values: string[]
  private _jsonpaths_to_push: number[]
  private _jsonpaths_to_pop: number[]
  private _jsonpaths_to_splice: { i: number; index: number }[]
  private _isJson: boolean

  constructor() {
    this.key = null
    this._jpath = null
    this._all_jsonpaths = []
    this._jsonpathFunc = null
    this._all_jsonpathFuncs = []
    this._all_jpaths = []
    this._value = null
    this._all_values = []
    this._isJson = false
    this._jsonpaths_to_push = []
    this._jsonpaths_to_pop = []
    this._jsonpaths_to_splice = []
  }

  public setKey(k: string): QueryFactory {
    if (this.key) throw new Error('Key already set')
    this.key = k
    return this
  }

  public setJPath(path: string): QueryFactory {
    this._isJson = true
    this._jpath = path
    this._all_jpaths.push(this._jpath)
    return this
  }

  public addJsonPath(path: string): QueryFactory {
    this._isJson = true
    this._all_jsonpaths.push(path)
    return this
  }

  public setJsonPathFunc(func: (value: any) => any): QueryFactory {
    this._jsonpathFunc = func
    this._all_jsonpathFuncs.push(func)
    this._all_values.push(undefined)
    return this
  }

  public setAndAddValue(v: any): QueryFactory {
    this._value = this.tryParseJson(v)
    this._all_values.push(this._value)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    this._all_jsonpathFuncs.push(undefined)
    return this
  }
  public addDelete(): QueryFactory {
    this._value = undefined
    this._all_values.push(undefined)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    this._all_jsonpathFuncs.push((_) => undefined)
    return this
  }

  public async exec(consul: IMigrationClient): Promise<void> {
    if (this._isJson) {
      const result = await consul.get<any>(this.key)
      if (result) {
        const parsed =
          typeof result === 'string' ? JSON.parse(result) : result ?? {}

        const helper = new JSONHelper(parsed)
        if (this._all_jsonpaths.length) {
          this.handleJsonPaths(helper)
        }
        if (this._all_jpaths.length) {
          this.handleDeprecatedJpaths(helper)
        }
        return consul.set(this.key, helper.toString(true))
      }
    }
    return this.setValueAsString(consul)
  }
  private setValueAsString(consul: IMigrationClient): Promise<void> {
    if (typeof this._value === 'object')
      return consul.set(this.key, JSON.stringify(this._value ?? {}, null, 2))
    return consul.set(this.key, this._value?.toString() ?? '')
  }
  private handleJsonPaths<T = any>(
    helper: JSONHelper<T>,
    remove?: boolean
  ): void {
    for (let i = 0; i < this._all_jsonpaths.length; i++) {
      if (jp.query(helper.getJSON(), this._all_jsonpaths[i]).length) {
        if (remove)
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          jp.apply(helper.getJSON(), this._all_jsonpaths[i], (_) => undefined)
        else if (this._jsonpaths_to_push.includes(i)) {
          jp.apply(helper.getJSON(), this._all_jsonpaths[i], (existing) => [
            ...existing,
            this._all_values[i],
          ])
        } else if (this._jsonpaths_to_pop.includes(i)) {
          jp.apply(helper.getJSON(), this._all_jsonpaths[i], (existing) => {
            existing.pop()
            return existing
          })
        } else if (this._jsonpaths_to_splice.map((x) => x.i).includes(i)) {
          jp.apply(helper.getJSON(), this._all_jsonpaths[i], (existing) => {
            const { index } = this._jsonpaths_to_splice.find((x) => x.i === i)
            ;(existing as any[]).splice(index, 0, this._all_values[i])
            return existing
          })
        } else this.applyValueFunctionOrValue(helper, i)
      } else {
        if (!remove) this.insertValueFunctionOrValue(helper, i)
      }
    }
  }
  private applyValueFunctionOrValue<T = any>(
    helper: JSONHelper<T>,
    index: number
  ): void {
    if (
      this._all_jsonpathFuncs.length > index &&
      this._all_jsonpathFuncs[index]
    )
      jp.apply(
        helper.getJSON(),
        this._all_jsonpaths[index],
        this._all_jsonpathFuncs[index]
      )
    else if (this._all_values.length > index && this._all_values[index])
      jp.apply(
        helper.getJSON(),
        this._all_jsonpaths[index],
        () => this._all_values[index]
      )
    else
      jp.apply(
        helper.getJSON(),
        this._all_jsonpaths[index],
        this._jsonpathFunc ?? ((v) => v)
      )
  }

  private insertValueFunctionOrValue<T = any>(
    helper: JSONHelper<T>,
    index: number
  ): void {
    if (
      this._all_jsonpathFuncs.length > index &&
      this._all_jsonpathFuncs[index]
    )
      helper.insertObjectAtJPath(
        this._all_jsonpaths[index],
        this._all_jsonpathFuncs[index]({})
      )
    else if (this._all_values.length > index && this._all_values[index])
      helper.insertObjectAtJPath(
        this._all_jsonpaths[index],
        this._all_values[index]
      )
    else helper.insertObjectAtJPath(this._all_jsonpaths[index], {})
  }
  private handleDeprecatedJpaths<T = any>(
    helper: JSONHelper<T>,
    remove?: boolean
  ): void {
    for (const i in this._all_jpaths) {
      if (remove) helper.removeJPath(this._all_jpaths[i])
      else helper.setJPathValue(this._all_jpaths[i], this._all_values[i])
    }
  }
  public splice(val: any, index?: number): QueryFactory {
    if (
      this._jsonpaths_to_splice[this._jsonpaths_to_splice.length - 1] &&
      this._jsonpaths_to_splice[this._jsonpaths_to_splice.length - 1].i ===
        this._all_jsonpaths.length - 1
    ) {
      this._all_jsonpaths.push(
        this._all_jsonpaths[this._all_jsonpaths.length - 1]
      )
    }
    this._jsonpaths_to_splice.push({
      i: this._all_values.length,
      index: index ?? 0,
    })
    this.setAndAddValue(val)
    return this
  }
  public push(val: any): QueryFactory {
    if (
      this._jsonpaths_to_push[this._jsonpaths_to_push.length - 1] ===
      this._all_jsonpaths.length - 1
    ) {
      this._all_jsonpaths.push(
        this._all_jsonpaths[this._all_jsonpaths.length - 1]
      )
    }
    this._jsonpaths_to_push.push(this._all_values.length)
    this.setAndAddValue(val)
    return this
  }
  public pop(): QueryFactory {
    if (
      this._jsonpaths_to_pop[this._jsonpaths_to_pop.length - 1] ===
      this._all_jsonpaths.length - 1
    ) {
      this._all_jsonpaths.push(
        this._all_jsonpaths[this._all_jsonpaths.length - 1]
      )
    }
    this._jsonpaths_to_pop.push(this._all_values.length)
    this.addDelete()
    return this
  }

  public async remove(consul: IMigrationClient): Promise<void> {
    if (this._isJson) {
      console.log(
        'this method is deprecated on jsonpath values, use remove() instead'
      )
      const result = await consul.get<any>(this.key)
      if (result) {
        const parsed =
          typeof result === 'string' ? JSON.parse(result) : result ?? {}

        const helper = new JSONHelper(parsed)
        if (this._all_jsonpaths.length) {
          this.handleJsonPaths(helper, true)
        }
        if (this._all_jpaths.length) {
          this.handleDeprecatedJpaths(helper, true)
        }
        return consul.set(this.key, helper.toString(true))
      }
    }
    return consul.delete(this.key)
  }

  private tryParseJson(s: string) {
    try {
      return JSON.parse(s)
    } catch {
      return s
    }
  }
}
