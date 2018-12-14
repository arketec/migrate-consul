"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("./../../constants/database");
const mongoose = require("mongoose");
/**
 * MongoDB schema for a consul migration
 */
const schema = new mongoose.Schema({
    name: { type: String, required: true },
    hash: { type: String },
    date_added: { type: Date, required: true },
    date_applied: { type: Date },
    date_last_changed: { type: Date },
    status: { type: database_1.Status, required: true },
    script_author: { type: String, required: true },
    changed_by: { type: String }
});
const Migration = mongoose.model("migration", schema);
exports.Migration = Migration;
