"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class JSONHelper {
    constructor(jsonString) {
        this._json = JSON.parse(jsonString);
    }
    getJSON() {
        return this._json;
    }
    toString(pretty) {
        if (pretty)
            return JSON.stringify(this._json, null, 2);
        else
            return JSON.stringify(this._json);
    }
    clone() {
        return JSON.parse(JSON.stringify(this._json));
    }
    getJPathValue(jpath) {
        let keys = this.jPathToKeys(jpath);
        let ptr = this.clone();
        for (let i in keys) {
            ptr = ptr[keys[i]];
        }
        return ptr;
    }
    setJPathValue(jpath, val) {
        let keys = this.jPathToKeys(jpath);
        let toEval = "this._json";
        for (let i in keys) {
            toEval += `['${keys[i]}']`;
        }
        switch (typeof val) {
            case 'string':
                toEval += ` = '${val}'`;
                break;
            case 'object':
                toEval += ` = ${JSON.stringify(val)}`;
                break;
            case 'function':
                throw new Error('Cannot set a json value to a function');
            default:
                toEval += ` = ${val}`;
                break;
        }
        eval(toEval);
    }
    removeJPath(jpath) {
        let keys = this.jPathToKeys(jpath);
        let toEval = "delete this._json";
        for (let i in keys) {
            toEval += `['${keys[i]}']`;
        }
        eval(toEval);
    }
    jPathToKeys(jpath) {
        return jpath.split('.');
    }
}
exports.JSONHelper = JSONHelper;
