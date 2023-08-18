import * as Consul from 'consul'
import { Backup, IRepo, Migration } from '../types'
import * as path from 'path'

export class ConsulMigrationRepo implements IRepo {
  private _client: Consul.Consul
  private static readonly key = '__migrations'
  private static readonly backupKey = '__backups'
  constructor(consul?: Consul.Consul) {
    this._client = consul ?? new Consul()
  }
  async save(migration: Migration): Promise<void> {
    const migrations = await this.getAll()
    migrations.push(migration)
    migrations.sort((a, b) => a.name.localeCompare(b.name))
    await this._client.kv.set(
      ConsulMigrationRepo.key,
      JSON.stringify(migrations, null, 2)
    )
  }
  async saveAll(migrations: Migration[]): Promise<void> {
    const existing = await this.getAll()
    const newMigrations = [
      ...existing,
      ...migrations.filter((m) => !existing.find((e) => e.name === m.name)),
    ]
    newMigrations.sort((a, b) => a.name.localeCompare(b.name))
    await this._client.kv.set(
      ConsulMigrationRepo.key,
      JSON.stringify(newMigrations, null, 2)
    )
  }
  async get(name: string): Promise<Migration> {
    const migrations = await this.getAll()
    return migrations.find((m) => m.name === name)
  }
  async getAll(): Promise<Migration[]> {
    const { Value } = await this._client.kv.get<{ Value: string }>(
      ConsulMigrationRepo.key
    )
    if (!Value) return []
    return JSON.parse(Value)
  }
  async find(status: number): Promise<Migration[]> {
    const migrations = await this.getAll()
    return migrations.filter((m) => m.status === status)
  }
  async findByAuthor(name: string): Promise<Migration[]> {
    const migrations = await this.getAll()
    return migrations.filter((m) => m.script_author === name)
  }
  async delete(name: string): Promise<void> {
    const migrations = await this.getAll()
    const index = migrations.findIndex((m) => m.name === name)
    migrations.splice(index, 1)
    await this._client.kv.set(
      ConsulMigrationRepo.key,
      JSON.stringify(migrations, null, 2)
    )
  }
  async backup(key: string, value: string): Promise<void> {
    await this._client.kv.set(
      path.join(ConsulMigrationRepo.backupKey, key, new Date().toISOString()),
      Buffer.from(value).toString('base64')
    )
  }
  async findBackups(key: string): Promise<Backup[]> {
    const backups = await this._client.kv.get<{ Key: string; Value: string }[]>(
      {
        key: path.join(ConsulMigrationRepo.backupKey, key),
        recurse: true,
      }
    )
    if (!backups) return []
    return backups.map(({ Key, Value }) => ({
      key: key,
      value: Buffer.from(Value, 'base64').toString('utf-8'),
      date: new Date(Key.split('/').at(-1)),
    }))
  }
  async restore(key: string, date?: Date): Promise<string> {
    const backups = await this.findBackups(key)
    const backup = date
      ? backups.find((b) => b.date.toISOString() === date.toISOString())
      : backups.at(-1)

    return backup.value
  }
}
