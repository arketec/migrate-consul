export class JSONHelper<T> {
  private _json: T
  constructor(jsonString: string | T) {
    this._json =
      typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString
  }

  public getJSON(): T {
    return this._json
  }

  public toString(pretty?: boolean): string {
    if (pretty) return JSON.stringify(this._json ?? {}, null, 2)
    else return JSON.stringify(this._json ?? {})
  }

  public clone(): T {
    return JSON.parse(JSON.stringify(this._json ?? {}))
  }

  public getJPathValue(jpath: string): any {
    const keys = this.jPathToKeys(jpath)
    let ptr = this.clone()

    for (const i in keys) {
      ptr = ptr[keys[i]]
    }

    return ptr
  }

  public setJPathValue(jpath: string, val: any): void {
    const keys = this.jPathToKeys(jpath)
    let toEval = 'this._json'
    for (const i in keys) {
      toEval += `['${keys[i]}']`
    }

    switch (typeof val) {
      case 'string':
        toEval += ` = '${val}'`
        break
      case 'object':
        toEval += ` = ${JSON.stringify(val)}`
        break
      case 'function':
        throw new Error('Cannot set a json value to a function')
      default:
        toEval += ` = ${val}`
        break
    }

    eval(toEval)
  }

  public pushJPathValue(jpath: string, val: any): void {
    jpath = jpath.split('.').slice(1).join('.')
    const keys = this.jPathToKeys(jpath)
    let toEval = 'this._json'
    for (const i in keys) {
      toEval += `['${keys[i]}']`
    }

    switch (typeof val) {
      case 'string':
        toEval += ` = '${val}'`
        break
      case 'object':
        toEval += ` = ${JSON.stringify(val)}`
        break
      case 'function':
        throw new Error('Cannot set a json value to a function')
      default:
        toEval += ` = ${val}`
        break
    }

    eval(toEval)
  }

  public removeJPath(jpath: string): any {
    jpath = jpath.split('.').slice(1).join('.')
    const keys = this.jPathToKeys(jpath)
    let toEval = 'delete this._json'
    for (const i in keys) {
      toEval += `['${keys[i]}']`
    }

    eval(toEval)
  }

  private jPathToKeys(jpath: string): string[] {
    return jpath.split('.')
  }

  public insertObjectAtJPath(jPath: string, val: any): void {
    let schema = this._json
    jPath = jPath.split('.').slice(1).join('.')
    const keys = this.jPathToKeys(jPath)
    const len = keys.length
    for (let i = 0; i < len - 1; i++) {
      const elem = keys[i]
      if (!schema[elem]) schema[elem] = {}
      schema = schema[elem]
    }
    schema[keys[len - 1]] = val
  }
}
