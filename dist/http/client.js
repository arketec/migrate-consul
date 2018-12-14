"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const session_1 = require("./session");
const consul = require("consul");
const query_factory_1 = require("./query_factory");
class Client {
    /**
     * Creates a new consul agent client
     * @constructor
     * @param opts - Optional host, port, and secure parameters. Defaults to localhost:8500
     */
    constructor(opts) {
        this._client = new consul(opts || { host: 'localhost', port: '8500', promisify: true });
        this._session = new session_1.Session(this._client);
        this._factory = new query_factory_1.QueryFactory();
    }
    /**
     * Prints a list of members to the console
     * @return {void} This function has no return value
     */
    members() {
        this._client.agent.members()
            .then(vals => console.log(JSON.stringify(vals, null, 2)))
            .catch(err => console.log(JSON.stringify(err, null, 2)));
    }
    /**
     * Prints current consul agent to the console
     * @return {void} This function has no return value
     */
    print() {
        this._client.agent.self()
            .then(vals => console.log(JSON.stringify(vals, null, 2)))
            .catch(err => console.log(JSON.stringify(err, null, 2)));
    }
    /**
     * Provides a list of all keys with optional string filter
     * @param key - Optional string key filter
     * @param callback - Optional callback function. May also use Promise syntax
     */
    keys(key, callback) {
        if (callback)
            this._client.kv.keys(key, callback);
        else
            return this._client.kv.keys(key);
    }
    /**
     * Sets the key for the consul query factory
     * @param k - The key name
     */
    key(k) {
        this._factory.setKey(k);
        return this;
    }
    /**
     * Sets the json path of the value if the value is json
     * @param path - The jpath to the value
     */
    jpath(path) {
        this._factory.setJPath(path);
        return this;
    }
    /**
     * Sets the value of the query
     * @param v - The value
     */
    val(v) {
        this._factory.setValue(v);
        return this;
    }
    /**
     * Runs the query and sets the value or the json property value
     * @param callback - The callback function
     */
    save(callback) {
        this._factory.exec(this, callback);
    }
    /**
     * Deletes the key
     * @param callback - The callback function
     */
    drop(callback) {
        this._factory.remove(this, callback);
    }
    /**
     * Provides an entry from Consul based on passed key
     * @param key - Consul key to lookup
     * @param callback - Optional callback function. May also use Promise syntax
     */
    get(key, callback) {
        if (callback)
            this._client.kv.get(key, callback);
        else
            return new Promise((resolve, reject) => {
                this._client.kv.get(key, (err, result) => {
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
     * Creates a consul session and updates or creates Consul key with provided value. Session locks key while processing and will reject if
     * another process already has a lock on the key. Should be used for single-key creation/updates
     * @param key - Consul key to set
     * @param val - Value to set key to
     * @param callback - Optional callback. May also use Promise syntax. Note: Consul session is destroyed before callback is made
     */
    set(key, val, callback) {
        if (callback) {
            this._session.create((err, sessionId) => {
                if (err) {
                    callback(err, false);
                }
                else {
                    this.put(key, val, (err, success) => {
                        if (err) {
                            callback(err, false);
                        }
                        else {
                            this._session.destroy((err) => {
                                if (err) {
                                    callback(err, false);
                                }
                                else {
                                    callback(null, true);
                                }
                            });
                        }
                    });
                }
            });
        }
        else
            return new Promise((resolve, reject) => {
                this._session.create((err, sessionId) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        this.put(key, val, (err, success) => {
                            if (err) {
                                reject(err);
                            }
                            else {
                                this._session.destroy((err) => {
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
                });
            });
    }
    /**
     * Creates a consul session and updates or creates Consul keys with provided values. Session locks keys while processing and will reject if
     * another process already has a lock on any keys provided. Should be used for multi-key creation/updates
     * @param kvpairs - Consul keys to set along with values
     * @param callback - Optional callback. May also use Promise syntax. Note: Consul session is destroyed before callback is made
     */
    setMany(kvpairs, callback) {
        let results = {};
        if (callback) {
            this._session.create().then(() => {
                let promises = [];
                Object.keys(kvpairs).forEach((k) => {
                    promises.push(this.put(k, kvpairs[k]));
                });
                Promise.all(promises).then((successes) => {
                    this._session.destroy((err) => {
                        if (err) {
                            callback(err);
                        }
                        else {
                            Object.keys(kvpairs).forEach((k, i) => {
                                results[k] = successes[i];
                            });
                            callback(null, results);
                        }
                    });
                }).catch(err => callback(err));
            }).catch(err => callback(err));
        }
        else {
            return new Promise((resolve, reject) => {
                this._session.create().then(() => {
                    let promises = [];
                    Object.keys(kvpairs).forEach((k) => {
                        promises.push(this.put(k, kvpairs[k]));
                    });
                    Promise.all(promises).then((successes) => {
                        this._session.destroy((err) => {
                            if (err) {
                                reject(err);
                            }
                            else {
                                Object.keys(kvpairs).forEach((k, i) => {
                                    results[k] = successes[i];
                                });
                                resolve(results);
                            }
                        });
                    }).catch(err => reject(err));
                }).catch(err => reject(err));
            });
        }
    }
    /**
     * Updates or creates Consul key with provided value without creating a consul session first.
     * Note: DO NOT use this function unless you cannot lock the Consul session for some good reason. Use .set instead
     * @param key - Consul key to set
     * @param val - Value to set key to
     * @param callback - Optional callback. May also use Promise syntax
     */
    put(key, val, callback) {
        if (callback)
            this._client.kv.set({
                key: key,
                value: val,
                acquire: this._session.active() ? this._session.getSessionId() : undefined
            }, callback);
        else
            return new Promise((resolve, reject) => {
                this._client.kv.set({
                    key: key,
                    value: val,
                    acquire: this._session.active() ? this._session.getSessionId() : undefined
                }, (err) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(true);
                    }
                });
            });
    }
    /**
     * Removes the provided key from the Consul KV pairs
     * @param key - The key to delete
     * @param callback - Optional callback for error handling. May also use Promise syntax
     */
    delete(key, callback) {
        if (callback)
            this._client.kv.del(key, callback);
        else
            return new Promise((resolve, reject) => {
                this._client.kv.del(key, (err) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            });
    }
    /**
     * Removes the provided keys from the Consul KV pairs
     * @param keys - The keys to delete
     * @param callback - Optional callback for error handling. May also use Promise syntax
     */
    deleteMany(keys, callback) {
        if (callback) {
            this._session.create().then(() => {
                let promises = [];
                keys.forEach((k) => {
                    promises.push(this.delete(k));
                });
                Promise.all(promises).then(() => {
                    this._session.destroy((err) => {
                        if (err) {
                            callback(err);
                        }
                        else {
                            callback(null);
                        }
                    });
                }).catch(err => callback(err));
            }).catch(err => callback(err));
        }
        else {
            return new Promise((resolve, reject) => {
                this._session.create().then(() => {
                    let promises = [];
                    keys.forEach((k) => {
                        promises.push(this.delete(k));
                    });
                    Promise.all(promises).then(() => {
                        this._session.destroy((err) => {
                            if (err) {
                                reject(err);
                            }
                            else {
                                resolve();
                            }
                        });
                    }).catch(err => reject(err));
                }).catch(err => reject(err));
            });
        }
    }
}
exports.Client = Client;
