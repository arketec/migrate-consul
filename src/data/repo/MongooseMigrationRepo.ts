import '../../polyfills'

import { Backup, Migration } from '../types/models'
import { Document, Model, Schema, Types } from 'mongoose'

import { IRepo } from '../types'
import { MongooseAccess } from '../mongo_adapter'

const schema = new Schema({
  name: { type: String, required: true },
  hash: { type: String },
  date_added: { type: Date, required: true },
  date_applied: { type: Date },
  date_last_changed: { type: Date },
  status: { type: Number, required: true },
  script_author: { type: String, required: true },
  changed_by: { type: String },
})

const backupSchema = new Schema({
  key: { type: String, required: true },
  value: { type: String, required: true },
  date: { type: Date, required: true },
})

export class MongooseMigrationRepo implements IRepo {
  private migrationRepo: Model<Migration>
  private backupRepo: Model<Backup>
  constructor() {
    this.migrationRepo = MongooseAccess.mongooseConnection.model<Migration>(
      'migrations',
      schema
    )
    this.backupRepo = MongooseAccess.mongooseConnection.model<Backup>(
      'backups',
      backupSchema
    )
  }
  public async save(migration: Migration): Promise<void> {
    await this.migrationRepo.updateOne(
      { name: migration.name },
      { $set: migration },
      { upsert: true }
    )
  }
  async saveAll(migrations: Migration[]): Promise<void> {
    const existing = await this.getAll()
    const newMigrations = [
      ...existing,
      ...migrations.filter((m) => !existing.find((e) => e.name === m.name)),
    ]
    newMigrations.sort((a, b) => a.name.localeCompare(b.name))
    await Promise.all(
      newMigrations.map((m) =>
        this.migrationRepo.updateOne(
          { name: m.name },
          { $set: m },
          { upsert: true }
        )
      )
    )
  }
  public async get(name: string): Promise<Migration> {
    const migration = await this.migrationRepo.findOne({ name })
    return this.mapMigration(migration)
  }
  public async getAll(): Promise<Migration[]> {
    const migrations = await this.migrationRepo.find({})
    return migrations.map(this.mapMigration)
  }
  public async find(status: number): Promise<Migration[]> {
    const migrations = await this.migrationRepo.find({ status })
    return migrations.map(this.mapMigration)
  }
  public async findByAuthor(name: string): Promise<Migration[]> {
    const migrations = await this.migrationRepo.find({
      script_author: name,
      status: { $ne: 2 },
    })
    return migrations.map(this.mapMigration)
  }
  public async delete(name: string): Promise<void> {
    await this.migrationRepo.deleteOne({ name })
  }

  public async backup(key: string, value: string): Promise<void> {
    await this.backupRepo.insertMany({
      key,
      value: Buffer.from(value).toString('base64'),
      date: new Date(),
    })
  }
  public async findBackups(key: string): Promise<Backup[]> {
    return this.backupRepo.find({ key })
  }

  public async restore(key: string, date?: Date): Promise<string> {
    const backup = date
      ? await this.backupRepo.find({ key, date })
      : await this.backupRepo.find({ key })
    const value = backup.at(-1).value
    return Buffer.from(value, 'base64').toString('utf8')
  }
  private mapMigration(
    migration: Document<unknown, any, Migration> &
      Migration & {
        _id: Types.ObjectId
      }
  ) {
    if (!migration) return undefined
    return {
      name: migration.name,
      hash: migration.hash,
      date_added: migration.date_added,
      date_applied: migration.date_applied,
      date_last_changed: migration.date_last_changed,
      status: migration.status,
      script_author: migration.script_author,
      changed_by: migration.changed_by,
    }
  }
}
