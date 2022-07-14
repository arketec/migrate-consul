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

  jpath(path: string): IMigrationClient
  jsonpath(jsonpath: string): IMigrationClient
  push(): Promise<void>
  pop(): Promise<void>
  save(): Promise<void>
  drop(): Promise<void>
}
