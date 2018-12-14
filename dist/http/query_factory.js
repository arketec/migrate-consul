"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const json_1 = require("./../util/json");
class QueryFactory {
    constructor() {
        this._key = null;
        this._jpath = null;
        this._all_jpaths = [];
        this._value = null;
        this._all_values = [];
        this._isJson = false;
    }
    setKey(k) {
        this._key = k;
    }
    setJPath(path) {
        this._isJson = true;
        this._jpath = path;
        this._all_jpaths.push(this._jpath);
    }
    setValue(v) {
        this._value = v;
        this._all_values.push(this._value);
    }
    exec(consul, callback) {
        if (this._isJson) {
            consul.get(this._key, (err, result) => {
                if (err) {
                    callback(err);
                }
                else {
                    if (!JSON.parse(result.Value)) {
                        throw new Error('Current value is not a json object');
                    }
                    let helper = new json_1.JSONHelper(result.Value);
                    for (var i in this._all_jpaths) {
                        helper.setJPathValue(this._all_jpaths[i], this._all_values[i]);
                    }
                    consul.set(this._key, helper.toString(true), callback);
                }
            });
        }
        else {
            consul.set(this._key, this._value, callback);
        }
    }
    remove(consul, callback) {
        if (this._isJson) {
            consul.get(this._key, (err, result) => {
                if (err) {
                    callback(err);
                }
                else {
                    if (!JSON.parse(result.Value)) {
                        throw new Error('Current value is not a json object');
                    }
                    let helper = new json_1.JSONHelper(result.Value);
                    for (var i in this._all_jpaths) {
                        helper.removeJPath(this._all_jpaths[i]);
                    }
                    consul.set(this._key, helper.toString(true), callback);
                }
            });
        }
        else {
            consul.delete(this._key, callback);
        }
    }
}
exports.QueryFactory = QueryFactory;
