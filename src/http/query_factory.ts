import { Client } from './client';
import { JSONHelper } from './../util/json';
export class QueryFactory {
    private _key: string
    private _jpath: string
    private _all_jpaths: string[]
    private _value: any
    private _all_values: string[]
    private _isJson: boolean

    constructor() {
        this._key = null;
        this._jpath = null;
        this._all_jpaths = [];
        this._value = null;
        this._all_values = [];
        this._isJson = false;
    }

    public setKey(k: string) {
        this._key = k;
    }

    public setJPath(path: string) {
        this._isJson = true
        this._jpath = path
        this._all_jpaths.push(this._jpath)
    }

    public setValue(v: any) {
        this._value = v
        this._all_values.push(this._value)
    }

    public exec(consul: Client, callback) {
        if (this._isJson) {
            consul.get(this._key, (err, result)=>{
                if (err) {
                    callback(err)
                } else {
                    if (!JSON.parse(result.Value)) {
                        throw new Error('Current value is not a json object')
                    }
                    let helper = new JSONHelper(result.Value)
                    
                    for (var i in this._all_jpaths) {
                        helper.setJPathValue(this._all_jpaths[i], this._all_values[i])
                    }
                    consul.set(this._key, helper.toString(true), callback)
                }
            })
        } else {
            consul.set(this._key, this._value, callback)
        }
        
    }

    public remove(consul: Client, callback) {
        if (this._isJson) {
            consul.get(this._key, (err, result)=>{
                if (err) {
                    callback(err)
                } else {
                    if (!JSON.parse(result.Value)) {
                        throw new Error('Current value is not a json object')
                    }
                    let helper = new JSONHelper(result.Value)
                    for (var i in this._all_jpaths) {
                        helper.removeJPath(this._all_jpaths[i])
                    }
                    consul.set(this._key, helper.toString(true), callback)
                }
            })
        } else {
            consul.delete(this._key, callback)
        }
    }
}