import { Client } from './../http/client';
import { MigrationReports, MigrationInstance } from './../data_access/mongo_adapter';
import { Status } from './../constants/database';
import {ConfigIO, MigrationsIO, DEFAULT_CONFIG_FILENAME} from '../util/file'
import * as fs from 'fs'
import * as path from 'path'
import { nowAsString } from '../util/date';
import * as crypto from 'crypto'
const _ = require('lodash')

export class Actions {
    /**
     * Generates a config file in the root directory
     * @param force - Deletes any existing config files before generating a new one
     */
    public init(force?: boolean) {
        let template = path.join(__dirname, "../../dist/templates/config.template.js")
        let configPath = path.join(process.cwd(), DEFAULT_CONFIG_FILENAME)
        return new Promise((resolve, reject) => {
            if (fs.existsSync(configPath)) {
                if (!force)
                    reject(`file '${configPath}' already exists. Please reuse or run 'init' again with the '--force' option`)
                else {
                    fs.unlink(configPath, (err)=> {
                        if (err) {
                            reject(err)
                        } else {
                            fs.copyFile(template, configPath, (err) => {
                                if (err) {
                                    reject(err)
                                } else {
                                    resolve()
                                }
                            })
                        }
                    })
                }
            } else {
                fs.copyFile(template, configPath, (err) => {
                    if (err) {
                        reject(err)
                    } else {
                        resolve()
                    }
                })
            }
        })
    }

    /**
     * Creates a new migration script
     * @param desc - The description to include in the name of the script file
     */
    public create(desc: string) {
        let migrationsDir = MigrationsIO.getPath()
        let template = path.join(__dirname, "../../dist/templates/migration.template.js")
        let filename = `${nowAsString()}-${desc
            .split(" ")
            .join("_")}.js`;

        let config = ConfigIO.load()
        
        if (!fs.existsSync(config.migrations_directory)) {
            fs.mkdirSync(config.migrations_directory)
        }
    
        return new Promise( (resolve, reject) => fs.copyFile(template, path.join(migrationsDir, filename), (err) => {
            if (err) {
                reject(err)
            } else {
                resolve(filename)
            }
        }))
    }

    /**
     * Stages all or the specified files for migration
     * @param author - Optional - The author of the script
     * @param filename - Optional - A specific file to migrate
     */
    public stage(author?: string, filename?: string) {
        return new Promise((resolve, reject)=>{
            if (filename) { // run only the provided file
                let db = new MigrationInstance(filename)
                db.add(author)
                    .then(()=> resolve(filename))
                    .catch(reject)
            } else { // run all pending
                fs.readdir(path.join(process.cwd(), global['options'].migrations_directory), (err, files)=> {
                    let promises = []
                    let reports = new MigrationReports()
                    reports.get({}).then(results => {
                        files.forEach(file => {
                            if (_.find(results, {name: file}) === undefined) {
                                let db = new MigrationInstance(file)
                                promises.push({migration: db.add(author), name: file})
                            }
                        })
                        Promise.all(_.map(promises, 'migration')).then(() => {
                            resolve(_.map(promises, 'name'))
                        }).catch(reject)
                    }).catch(reject)
                })
            }
        })
    }

    /**
     * Runs all pending migrations
     * @param changedBy - Optional - the user who ran this job
     */
    public up(changedBy?: string) {
        return new Promise((resolve, reject) => {
            let reports = new MigrationReports()
            reports.get({status: Status.PENDING})
                .then(migrations => {
                    let promises = []
                    migrations.forEach(migration => {
                        let script = MigrationsIO.load(migration.name).up
                        promises.push(new Promise((resolve, reject) => {
                            let config = ConfigIO.load()
                            let client = new Client({host: config.consul.host, port: config.consul.port.toString(), secure: config.consul.ssl})
                            script(client, config.environment, (err)=> {
                                let db = new MigrationInstance(migration.name)
                                if (err) {
                                    db.updateStatus(Status.FAILED, changedBy)
                                        .then(modified => {
                                            reject(`Migration ${migration.name} failed: ` + err.toString())
                                        })
                                        .catch(reject)
                                } else {
                                    db.apply(fs.readFileSync(MigrationsIO.getPath() + '/' + migration.name), changedBy)
                                        .then(modified => {
                                            resolve(migration.name)
                                        })
                                        .catch(reject)
                                }

                            })
                        }))
                    })
                    Promise.all(promises).then(() => resolve(_.map(migrations, 'name'))).catch(reject)
                }).catch(reject)  
            })
    }

    /**
     * Rollback of last migration ran
     * @param changedBy - Optional - the user who ran this job
     */
    public down(changedBy?: string) {
        return new Promise((resolve, reject) => {
            let reports = new MigrationReports()
            reports.getLastApplied()
                .then(migration => {
                    let script = MigrationsIO.load(migration.name).down
                    let config = ConfigIO.load()
                    let client = new Client({host: config.consul.host, port: config.consul.port.toString(), secure: config.consul.ssl})
                    script(client, config.environment, (err)=> {
                        let db = new MigrationInstance(migration.name)
                        if (err) {
                            db.updateStatus(Status.FAILED, changedBy)
                                .then(modified => {
                                    reject(`Migration ${migration.name} failed: ` + err.toString())
                                })
                                .catch(reject)
                        } else {
                            db.updateStatus(Status.DELETED, changedBy)
                                .then(modified => {
                                    resolve(migration.name)
                                })
                                .catch(reject)
                        }
                    })
                }).catch(reject)  
            })
    }

    /**
     * Returns all migrations based on provided parameters
     * @param status - Optional - Filter on provided status
     * @param author - Optional - Filter on provided author
     * @param user - Optional - Filter on provided changedBy user
     */
    public reports(status?: Status, author?: string, user?: string) {
        return new Promise((resolve, reject)=> {
            let reports = new MigrationReports()
            if (!(status || author || user))
                reports.getCurrent().then(resolve).catch(reject)
            else {
                let filter = {}
                if (status)
                    filter['status'] = status
                if (author)
                    filter['script_author'] = author
                if (user)
                    filter['changed_by'] = user
                return reports.get(filter).then(resolve).catch(reject)
            }
        })
    }

    /**
     * Restages provided file or last failed migration as long as hash matches
     * @param name Optional - Name of file to restage
     */
    public restage(name?: string, changedBy?: string, status?: string) {
        return new Promise((resolve, reject)=> {
            let reports = new MigrationReports()
            if (name) {
                reports.getOne({name: name}).then(migration => {
                    let scriptText = fs.readFileSync(MigrationsIO.getPath() + '/' + migration.name);
                    if (migration.status == Status.FAILED || migration.hash === crypto.createHash('sha1').update(scriptText).digest('base64')){
                        let db = new MigrationInstance(migration.name)
                        db.updateStatus(Status.PENDING, changedBy).then(()=> {
                            resolve(migration.name)
                        }).catch(reject)
                    } else {
                        reject(`Error: Script has changed. Hash for file ${migration.name} does not match.`)
                    }
                })
            } else if (status) {
                reports.getLast(Status[status.toUpperCase()]).then(migration => {
                    let scriptText = fs.readFileSync(MigrationsIO.getPath() + '/' + migration.name);
                    if (migration.status == Status.FAILED || migration.hash === crypto.createHash('sha1').update(scriptText).digest('base64')){
                        let db = new MigrationInstance(migration.name)
                        db.updateStatus(Status.PENDING, changedBy).then(()=> {
                            resolve(migration.name)
                        }).catch(reject)
                    } else {
                        reject(`Error: Script has changed. Hash for file ${migration.name} does not match.`)
                    }
                })
            } else {
                reports.getLastFailed().then(migration => {
                    let db = new MigrationInstance(migration.name)
                    db.updateStatus(Status.PENDING, changedBy).then(()=> {
                        resolve(migration.name)
                    }).catch(reject)
                })
            }
        })
    }
}