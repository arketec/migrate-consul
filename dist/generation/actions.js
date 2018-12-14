"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("./../http/client");
const mongo_adapter_1 = require("./../data_access/mongo_adapter");
const database_1 = require("./../constants/database");
const file_1 = require("../util/file");
const fs = require("fs");
const path = require("path");
const date_1 = require("../util/date");
const crypto = require("crypto");
const _ = require('lodash');
class Actions {
    /**
     * Generates a config file in the root directory
     * @param force - Deletes any existing config files before generating a new one
     */
    init(force) {
        let template = path.join(__dirname, "../../dist/templates/config.template.js");
        let configPath = path.join(process.cwd(), file_1.DEFAULT_CONFIG_FILENAME);
        return new Promise((resolve, reject) => {
            if (fs.existsSync(configPath)) {
                if (!force)
                    reject(`file '${configPath}' already exists. Please reuse or run 'init' again with the '--force' option`);
                else {
                    fs.unlink(configPath, (err) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            fs.copyFile(template, configPath, (err) => {
                                if (err) {
                                    reject(err);
                                }
                                else {
                                    resolve();
                                }
                            });
                        }
                    });
                }
            }
            else {
                fs.copyFile(template, configPath, (err) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            }
        });
    }
    /**
     * Creates a new migration script
     * @param desc - The description to include in the name of the script file
     */
    create(desc) {
        let migrationsDir = file_1.MigrationsIO.getPath();
        let template = path.join(__dirname, "../../dist/templates/migration.template.js");
        let filename = `${date_1.nowAsString()}-${desc
            .split(" ")
            .join("_")}.js`;
        let config = file_1.ConfigIO.load();
        if (!fs.existsSync(config.migrations_directory)) {
            fs.mkdirSync(config.migrations_directory);
        }
        return new Promise((resolve, reject) => fs.copyFile(template, path.join(migrationsDir, filename), (err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(filename);
            }
        }));
    }
    /**
     * Stages all or the specified files for migration
     * @param author - Optional - The author of the script
     * @param filename - Optional - A specific file to migrate
     */
    stage(author, filename) {
        return new Promise((resolve, reject) => {
            if (filename) { // run only the provided file
                let db = new mongo_adapter_1.MigrationInstance(filename);
                db.add(author)
                    .then(() => resolve(filename))
                    .catch(reject);
            }
            else { // run all pending
                fs.readdir(path.join(process.cwd(), global['options'].migrations_directory), (err, files) => {
                    let promises = [];
                    let reports = new mongo_adapter_1.MigrationReports();
                    reports.get({}).then(results => {
                        files.forEach(file => {
                            if (_.find(results, { name: file }) === undefined) {
                                let db = new mongo_adapter_1.MigrationInstance(file);
                                promises.push({ migration: db.add(author), name: file });
                            }
                        });
                        Promise.all(_.map(promises, 'migration')).then(() => {
                            resolve(_.map(promises, 'name'));
                        }).catch(reject);
                    }).catch(reject);
                });
            }
        });
    }
    /**
     * Runs all pending migrations
     * @param changedBy - Optional - the user who ran this job
     */
    up(changedBy) {
        return new Promise((resolve, reject) => {
            let reports = new mongo_adapter_1.MigrationReports();
            reports.get({ status: database_1.Status.PENDING })
                .then(migrations => {
                let promises = [];
                migrations.forEach(migration => {
                    let script = file_1.MigrationsIO.load(migration.name).up;
                    promises.push(new Promise((resolve, reject) => {
                        let config = file_1.ConfigIO.load();
                        let client = new client_1.Client({ host: config.consul.host, port: config.consul.port.toString(), secure: config.consul.ssl });
                        script(client, config.environment, (err) => {
                            let db = new mongo_adapter_1.MigrationInstance(migration.name);
                            if (err) {
                                db.updateStatus(database_1.Status.FAILED, changedBy)
                                    .then(modified => {
                                    reject(`Migration ${migration.name} failed: ` + err.toString());
                                })
                                    .catch(reject);
                            }
                            else {
                                db.apply(fs.readFileSync(file_1.MigrationsIO.getPath() + '/' + migration.name), changedBy)
                                    .then(modified => {
                                    resolve(migration.name);
                                })
                                    .catch(reject);
                            }
                        });
                    }));
                });
                Promise.all(promises).then(() => resolve(_.map(migrations, 'name'))).catch(reject);
            }).catch(reject);
        });
    }
    /**
     * Rollback of last migration ran
     * @param changedBy - Optional - the user who ran this job
     */
    down(changedBy) {
        return new Promise((resolve, reject) => {
            let reports = new mongo_adapter_1.MigrationReports();
            reports.getLastApplied()
                .then(migration => {
                let script = file_1.MigrationsIO.load(migration.name).down;
                let config = file_1.ConfigIO.load();
                let client = new client_1.Client({ host: config.consul.host, port: config.consul.port.toString(), secure: config.consul.ssl });
                script(client, config.environment, (err) => {
                    let db = new mongo_adapter_1.MigrationInstance(migration.name);
                    if (err) {
                        db.updateStatus(database_1.Status.FAILED, changedBy)
                            .then(modified => {
                            reject(`Migration ${migration.name} failed: ` + err.toString());
                        })
                            .catch(reject);
                    }
                    else {
                        db.updateStatus(database_1.Status.DELETED, changedBy)
                            .then(modified => {
                            resolve(migration.name);
                        })
                            .catch(reject);
                    }
                });
            }).catch(reject);
        });
    }
    /**
     * Returns all migrations based on provided parameters
     * @param status - Optional - Filter on provided status
     * @param author - Optional - Filter on provided author
     * @param user - Optional - Filter on provided changedBy user
     */
    reports(status, author, user) {
        return new Promise((resolve, reject) => {
            let reports = new mongo_adapter_1.MigrationReports();
            if (!(status || author || user))
                reports.getCurrent().then(resolve).catch(reject);
            else {
                let filter = {};
                if (status)
                    filter['status'] = status;
                if (author)
                    filter['script_author'] = author;
                if (user)
                    filter['changed_by'] = user;
                return reports.get(filter).then(resolve).catch(reject);
            }
        });
    }
    /**
     * Restages provided file or last failed migration as long as hash matches
     * @param name Optional - Name of file to restage
     */
    restage(name, changedBy, status) {
        return new Promise((resolve, reject) => {
            let reports = new mongo_adapter_1.MigrationReports();
            if (name) {
                reports.getOne({ name: name }).then(migration => {
                    let scriptText = fs.readFileSync(file_1.MigrationsIO.getPath() + '/' + migration.name);
                    if (migration.status == database_1.Status.FAILED || migration.hash === crypto.createHash('sha1').update(scriptText).digest('base64')) {
                        let db = new mongo_adapter_1.MigrationInstance(migration.name);
                        db.updateStatus(database_1.Status.PENDING, changedBy).then(() => {
                            resolve(migration.name);
                        }).catch(reject);
                    }
                    else {
                        reject(`Error: Script has changed. Hash for file ${migration.name} does not match.`);
                    }
                });
            }
            else if (status) {
                reports.getLast(database_1.Status[status.toUpperCase()]).then(migration => {
                    let scriptText = fs.readFileSync(file_1.MigrationsIO.getPath() + '/' + migration.name);
                    if (migration.status == database_1.Status.FAILED || migration.hash === crypto.createHash('sha1').update(scriptText).digest('base64')) {
                        let db = new mongo_adapter_1.MigrationInstance(migration.name);
                        db.updateStatus(database_1.Status.PENDING, changedBy).then(() => {
                            resolve(migration.name);
                        }).catch(reject);
                    }
                    else {
                        reject(`Error: Script has changed. Hash for file ${migration.name} does not match.`);
                    }
                });
            }
            else {
                reports.getLastFailed().then(migration => {
                    let db = new mongo_adapter_1.MigrationInstance(migration.name);
                    db.updateStatus(database_1.Status.PENDING, changedBy).then(() => {
                        resolve(migration.name);
                    }).catch(reject);
                });
            }
        });
    }
}
exports.Actions = Actions;
