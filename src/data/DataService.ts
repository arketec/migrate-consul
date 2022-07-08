import { IRepo, Migration } from './types'

import { Backup } from './types/models'

export class DataService implements IRepo {
  private _repo: IRepo
  constructor(repo: IRepo) {
    this._repo = repo
  }
  public save(migration: Migration): Promise<void> {
    return this._repo.save(migration)
  }
  public get(name: string): Promise<Migration> {
    return this._repo.get(name)
  }
  public getAll(): Promise<Migration[]> {
    return this._repo.getAll()
  }
  public find(status: number): Promise<Migration[]> {
    return this._repo.find(status)
  }
  public findByAuthor(name: string): Promise<Migration[]> {
    return this._repo.findByAuthor(name)
  }
  public findBackups(key: string): Promise<Backup[]> {
    return this._repo.findBackups(key)
  }
  public delete(name: string): Promise<void> {
    return this._repo.delete(name)
  }

  public backup(key: string, value: string): Promise<void> {
    return this._repo.backup(key, value)
  }
  public restore(key: string, date?: Date): Promise<string> {
    return this._repo.restore(key, date)
  }

  public async hasMigration(name: string, status?: number): Promise<boolean> {
    const migration = await this.get(name)
    if (status) return migration && migration.status == status
    return migration != undefined
  }
}
