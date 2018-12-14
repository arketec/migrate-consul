import { Status } from './../../constants/database';
import * as mongoose from 'mongoose';

/**
 * MongoDB document model of a consul migration
 */
export interface IConsulMigration extends mongoose.Document {
    name: string;
    hash?: string;
    date_added: Date;
    date_applied?: Date;
    date_last_changed?: Date;
    status: Status;
    script_author: string;
    changed_by?: string;
}

/**
 * MongoDB schema for a consul migration
 */
const schema = new mongoose.Schema({
            name: {type: String, required: true},
            hash: {type: String},
            date_added: {type: Date, required: true},
            date_applied: {type: Date},
            date_last_changed: {type: Date},
            status: {type: Status, required: true},
            script_author: {type: String, required: true},
            changed_by: {type: String}
        });

const Migration = mongoose.model<IConsulMigration>("migration", schema);
export {Migration};