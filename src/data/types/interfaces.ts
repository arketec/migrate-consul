import { Backup, Migration } from './models'
export interface IRepo {
  save(migration: Migration): Promise<void>
  get(name: string): Promise<Migration>
  getAll(): Promise<Migration[]>
  find(status: number): Promise<Migration[]>
  findByAuthor(name: string): Promise<Migration[]>
  delete(name: string): Promise<void>
  backup(key: string, value: string): Promise<void>
  findBackups(key: string): Promise<Backup[]>
  restore(key: string, date?: Date): Promise<string>
}
