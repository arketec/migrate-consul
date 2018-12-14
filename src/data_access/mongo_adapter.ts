import { ConfigIO } from './../util/file';
import { IConsulMigration, Migration } from './interface/iconsulmigration';
import * as crypto from 'crypto'
import { now } from '../util/date';
import { Status } from '../constants/database';
import * as mongoose from 'mongoose'

export class MigrationInstance {
    private _name: string;

    /**
     * Creates a new migration instance
     * @constructor
     * @param name - The name of the migration file
     */
    constructor(name: string) {
        this._name = name;
    }

    /**
     * Adds a new migration to the database
     * @param author - Optional - the name of the script author
     */
    public add(author?: string): Promise<IConsulMigration> {
        let m = new Migration()
        m.name =this._name
        m.date_added=now(),
        m.script_author=author || ''
        m.status=Status.PENDING
        

        return new Promise((resolve, reject)=> {
            m.save((err, result)=> {
                if (err) {
                    reject(err)
                } else {
                    resolve(result)
                }
            });
        })
    }

    /**
     * Updates the database by marking migration complete and hashing the script
     * @param migration - The migration script
     * @param changedBy - Optional - The user who ran this job
     */
    public apply(migration: string|Buffer, changedBy?: string): Promise<{n: number, nModified: number, ok: number}> {
        let n = now()
        return new Promise((resolve, reject)=>{
            Migration.updateOne({name: this._name}, {
                hash: crypto.createHash('sha1').update(migration).digest('base64'),
                date_applied: n, date_last_changed: n, 
                changed_by: changedBy, 
                status: Status.COMPLETED
            }, (err, numAffected)=>{
                if (err || numAffected.nModified > 1) {
                    reject(err)
                } else {
                    resolve(numAffected)
                }
            })
        })
    }

    /**
     * Updates the migration with a new status
     * @param status - The status to update to
     * @param changedBy - Optional - The user who ran this job
     */
    public updateStatus(status: Status, changedBy?: string): Promise<{n: number, nModified: number, ok: number}> {
        return new Promise((resolve, reject)=>{
            Migration.updateOne({name: this._name}, {date_last_changed: now(), changed_by: changedBy, status: status}, (err, numAffected)=>{
                if (err || numAffected.nModified > 1) {
                    reject(err)
                } else {
                    resolve(numAffected)
                }
            })
        })
    }
}

export class MigrationReports {
    
    /**
     * Returns results from the database based on the filter parameter
     * @param filter - Filter results on included properties
     */
    public get(filter): Promise<IConsulMigration[]> {
        return new Promise<IConsulMigration[]>((resolve, reject)=>{
            return Migration.find(filter, (err, result)=>{
                if (err) {
                    reject(err)
                } else {
                    resolve(result)
                }
            })
        })
    }

    /**
     * Returns results from the database based on the filter parameter
     * @param filter - Filter results on included properties
     */
    public getOne(filter): Promise<IConsulMigration> {
        return new Promise<IConsulMigration>((resolve, reject)=>{
            return Migration.findOne(filter, (err, result)=>{
                if (err) {
                    reject(err)
                } else {
                    resolve(result)
                }
            })
        })
    }

    /**
     * Returns all non-deleted migrations
     */
    public getCurrent(): Promise<IConsulMigration[]> {
        return this.get({$or: [{status: Status.PENDING}, {status: Status.FAILED}, {status: Status.COMPLETED}]})
    }

    /**
     * Returns last applied migration
     */
    public getLast(status: number): Promise<IConsulMigration> {
        return new Promise((resolve, reject) =>  Migration.find({status: status}).sort({"date_applied": -1}).limit(1).then(
            migrations => resolve(migrations[0])
        ).catch(reject))
    }

    /**
     * Returns last applied migration
     */
    public getLastApplied(): Promise<IConsulMigration> {
        return new Promise((resolve, reject) =>  Migration.find({status: Status.COMPLETED}).sort({"date_applied": -1}).limit(1).then(
            migrations => resolve(migrations[0])
        ).catch(reject))
    }

    /**
     * Returns last failed migration
     */
    public getLastFailed(): Promise<IConsulMigration> {
        return new Promise((resolve, reject) =>  Migration.find({status: Status.FAILED}).sort({"date_last_changed": -1}).limit(1).then(
            migrations => resolve(migrations[0])
        ).catch(reject))
    }
}