"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const iconsulmigration_1 = require("./interface/iconsulmigration");
const crypto = require("crypto");
const date_1 = require("../util/date");
const database_1 = require("../constants/database");
class MigrationInstance {
    /**
     * Creates a new migration instance
     * @constructor
     * @param name - The name of the migration file
     */
    constructor(name) {
        this._name = name;
    }
    /**
     * Adds a new migration to the database
     * @param author - Optional - the name of the script author
     */
    add(author) {
        let m = new iconsulmigration_1.Migration();
        m.name = this._name;
        m.date_added = date_1.now(),
            m.script_author = author || '';
        m.status = database_1.Status.PENDING;
        return new Promise((resolve, reject) => {
            m.save((err, result) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            });
        });
    }
    /**
     * Updates the database by marking migration complete and hashing the script
     * @param migration - The migration script
     * @param changedBy - Optional - The user who ran this job
     */
    apply(migration, changedBy) {
        let n = date_1.now();
        return new Promise((resolve, reject) => {
            iconsulmigration_1.Migration.updateOne({ name: this._name }, {
                hash: crypto.createHash('sha1').update(migration).digest('base64'),
                date_applied: n, date_last_changed: n,
                changed_by: changedBy,
                status: database_1.Status.COMPLETED
            }, (err, numAffected) => {
                if (err || numAffected.nModified > 1) {
                    reject(err);
                }
                else {
                    resolve(numAffected);
                }
            });
        });
    }
    /**
     * Updates the migration with a new status
     * @param status - The status to update to
     * @param changedBy - Optional - The user who ran this job
     */
    updateStatus(status, changedBy) {
        return new Promise((resolve, reject) => {
            iconsulmigration_1.Migration.updateOne({ name: this._name }, { date_last_changed: date_1.now(), changed_by: changedBy, status: status }, (err, numAffected) => {
                if (err || numAffected.nModified > 1) {
                    reject(err);
                }
                else {
                    resolve(numAffected);
                }
            });
        });
    }
}
exports.MigrationInstance = MigrationInstance;
class MigrationReports {
    /**
     * Returns results from the database based on the filter parameter
     * @param filter - Filter results on included properties
     */
    get(filter) {
        return new Promise((resolve, reject) => {
            return iconsulmigration_1.Migration.find(filter, (err, result) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            });
        });
    }
    /**
     * Returns results from the database based on the filter parameter
     * @param filter - Filter results on included properties
     */
    getOne(filter) {
        return new Promise((resolve, reject) => {
            return iconsulmigration_1.Migration.findOne(filter, (err, result) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            });
        });
    }
    /**
     * Returns all non-deleted migrations
     */
    getCurrent() {
        return this.get({ $or: [{ status: database_1.Status.PENDING }, { status: database_1.Status.FAILED }, { status: database_1.Status.COMPLETED }] });
    }
    /**
     * Returns last applied migration
     */
    getLast(status) {
        return new Promise((resolve, reject) => iconsulmigration_1.Migration.find({ status: status }).sort({ "date_applied": -1 }).limit(1).then(migrations => resolve(migrations[0])).catch(reject));
    }
    /**
     * Returns last applied migration
     */
    getLastApplied() {
        return new Promise((resolve, reject) => iconsulmigration_1.Migration.find({ status: database_1.Status.COMPLETED }).sort({ "date_applied": -1 }).limit(1).then(migrations => resolve(migrations[0])).catch(reject));
    }
    /**
     * Returns last failed migration
     */
    getLastFailed() {
        return new Promise((resolve, reject) => iconsulmigration_1.Migration.find({ status: database_1.Status.FAILED }).sort({ "date_last_changed": -1 }).limit(1).then(migrations => resolve(migrations[0])).catch(reject));
    }
}
exports.MigrationReports = MigrationReports;
