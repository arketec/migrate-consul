// export types
export * from './migrator'
export * from './data'

export interface IMigrationClient {
  get<T>(key: string): Promise<T>
  set(key: string, value: string): Promise<void>
  setMany(values: { [key: string]: string }): Promise<void>
  delete(key: string): Promise<void>
  deleteMany(keys: string[]): Promise<void>

  key(key: string): IMigrationClient
  val(val: any): IMigrationClient
  remove(): IMigrationClient
  push(val: any): IMigrationClient
  pop(): IMigrationClient
  splice(val: any, index?: number): IMigrationClient

  jpath(path: string): IMigrationClient
  jsonpath(jsonpath: string): IMigrationClient
  callback<T = any>(callback: (value: any) => T): IMigrationClient

  save(): Promise<void>
  drop(): Promise<void>
}
