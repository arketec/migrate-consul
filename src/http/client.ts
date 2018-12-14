import { ConsulKvGetResponse } from './client';
import { Session } from './session';
import * as consul from 'consul'
import { QueryFactory } from './query_factory';

export class Client {

    /**
     * @private - An instance of the consul client from the 'consul' npm package
     */
    private _client: consul.Consul

    /**
     * @private - An instance of a consul session
     */
    private _session: Session

    /**
     * 
     * @private - The consul query factory
     */
    private _factory: QueryFactory

    /**
     * Creates a new consul agent client
     * @constructor
     * @param opts - Optional host, port, and secure parameters. Defaults to localhost:8500
     */
    constructor(opts? : consul.ConsulOptions) {
        this._client = new consul(opts || {host: 'localhost', port: '8500', promisify: true})
        this._session = new Session(this._client)
        this._factory = new QueryFactory();
    }

    /**
     * Prints a list of members to the console
     * @return {void} This function has no return value
     */
    public members(): void {
        this._client.agent.members()
            .then(vals => console.log(JSON.stringify(vals,null, 2)))
            .catch(err => console.log(JSON.stringify(err,null, 2)))
    }

    /**
     * Prints current consul agent to the console
     * @return {void} This function has no return value
     */
    public print(): void {
        this._client.agent.self()
            .then(vals => console.log(JSON.stringify(vals,null, 2)))
            .catch(err => console.log(JSON.stringify(err,null, 2)))
    }

    /**
     * Provides a list of all keys with optional string filter
     * @param key - Optional string key filter
     * @param callback - Optional callback function. May also use Promise syntax
     */
    public keys(key?: string|undefined, callback?: (err: Error, keys: string[])=> void | undefined): consul.Thenable<string[]> {
        if (callback)
            this._client.kv.keys(key, callback)
        else
            return this._client.kv.keys(key)
    }

    /**
     * Sets the key for the consul query factory
     * @param k - The key name
     */
    public key(k: string): Client {
        this._factory.setKey(k)
        return this;
    }

    /**
     * Sets the json path of the value if the value is json
     * @param path - The jpath to the value
     */
    public jpath(path: string): Client {
        this._factory.setJPath(path)
        return this
    }

    /**
     * Sets the value of the query
     * @param v - The value
     */
    public val(v: any): Client {
        this._factory.setValue(v)
        return this
    }

    /**
     * Runs the query and sets the value or the json property value
     * @param callback - The callback function
     */
    public save(callback): void {
        this._factory.exec(this, callback)
    }

    /**
     * Deletes the key
     * @param callback - The callback function
     */
    public drop(callback): void {
        this._factory.remove(this, callback)
    }

    /**
     * Provides an entry from Consul based on passed key
     * @param key - Consul key to lookup
     * @param callback - Optional callback function. May also use Promise syntax
     */
    public get(key: string, callback?: (err: Error, val: ConsulKvGetResponse)=> void | undefined): Promise<ConsulKvGetResponse> {
        if(callback)
            this._client.kv.get(key, callback)
        else
            return new Promise((resolve, reject)=> {
                this._client.kv.get(key, (err, result: ConsulKvGetResponse)=>{
                    if (err) {
                        reject(err)
                    } else {
                        resolve(result)
                    }
                })
            })
    }

    /**
     * Creates a consul session and updates or creates Consul key with provided value. Session locks key while processing and will reject if
     * another process already has a lock on the key. Should be used for single-key creation/updates
     * @param key - Consul key to set
     * @param val - Value to set key to
     * @param callback - Optional callback. May also use Promise syntax. Note: Consul session is destroyed before callback is made
     */
    public set(key: string, val: string, callback?: (err: Error, success: boolean)=> void | undefined): Promise<void> {
        if (callback) {
            this._session.create((err, sessionId)=> {
                if (err) {
                    callback(err, false)
                } else {
                    
                    this.put(key, val, (err, success)=> {
                        if (err) {
                            callback(err, false)
                        } else {
                            this._session.destroy((err)=> {
                                if (err) {
                                    callback(err, false)
                                } else {
                                    callback(null, true)
                                }
                            })
                        }
                    })
                }
            })
        } else
            return new Promise((resolve, reject) => {
                this._session.create((err, sessionId)=> {
                    if (err) {
                        reject(err)
                    } else {
                        this.put(key, val, (err, success)=> {
                            if (err) {
                                reject(err)
                            } else {
                                this._session.destroy((err)=> {
                                    if (err) {
                                        reject(err)
                                    } else {
                                        resolve()
                                    }
                                })
                            }
                        })
                    }
                })
            })
    }

    /**
     * Creates a consul session and updates or creates Consul keys with provided values. Session locks keys while processing and will reject if
     * another process already has a lock on any keys provided. Should be used for multi-key creation/updates
     * @param kvpairs - Consul keys to set along with values
     * @param callback - Optional callback. May also use Promise syntax. Note: Consul session is destroyed before callback is made
     */
    public setMany(kvpairs: {[key: string]: string}, callback?: (err: Error, successes?: {[key: string]: boolean})=> void | undefined): Promise<{[key: string]: boolean}> {
        let results = {}
        if (callback) {
            this._session.create().then(()=>{
                let promises = []
                Object.keys(kvpairs).forEach((k)=>{
                    promises.push(this.put(k, kvpairs[k]))
                })
                Promise.all(promises).then((successes: boolean[]) => {
                    this._session.destroy((err) => {
                        if (err) {
                            callback(err)
                        } else {
                            Object.keys(kvpairs).forEach((k,i)=>{
                                results[k] = successes[i]
                            })
                            callback(null, results)
                        }
                    })
                    
                }).catch(err => callback(err))
            }).catch(err => callback(err))
        } else {
            return new Promise((resolve, reject)=> {
                this._session.create().then(()=>{
                    let promises = []
                    Object.keys(kvpairs).forEach((k)=>{
                        promises.push(this.put(k, kvpairs[k]))
                    })
                    Promise.all(promises).then((successes: boolean[]) => {
                        this._session.destroy((err) => {
                            if (err) {
                                reject(err)
                            } else {
                                Object.keys(kvpairs).forEach((k,i)=>{
                                    results[k] = successes[i]
                                })
                                resolve(results)
                            }
                        })
                    }).catch(err => reject(err))
                }).catch(err => reject(err))
            })
        }
    }

    /**
     * Updates or creates Consul key with provided value without creating a consul session first.
     * Note: DO NOT use this function unless you cannot lock the Consul session for some good reason. Use .set instead
     * @param key - Consul key to set
     * @param val - Value to set key to
     * @param callback - Optional callback. May also use Promise syntax
     */
    public put(key: string, val: string, callback?: (err: Error, success: boolean)=> void | undefined): Promise<boolean> {
        if (callback)
            this._client.kv.set({
                key: key, 
                value: val, 
                acquire: this._session.active() ? this._session.getSessionId(): undefined
            }, callback)
        else
            return new Promise((resolve, reject)=> {
                this._client.kv.set({
                    key: key, 
                    value: val, 
                    acquire: this._session.active() ? this._session.getSessionId(): undefined
                }, (err) => {
                    if (err) {
                        reject(err)
                    } else {
                        resolve(true)
                    }
                })
            })
    }

    /**
     * Removes the provided key from the Consul KV pairs
     * @param key - The key to delete
     * @param callback - Optional callback for error handling. May also use Promise syntax
     */
    public delete(key: string, callback?: (err: Error)=> void | undefined): Promise<void> {
        if (callback)
            this._client.kv.del(key, callback)
        else
            return new Promise((resolve, reject)=>{
                this._client.kv.del(key, (err)=> {
                    if (err) {
                        reject(err)
                    } else {
                        resolve()
                    }
                })
            }) 
    }

    /**
     * Removes the provided keys from the Consul KV pairs
     * @param keys - The keys to delete
     * @param callback - Optional callback for error handling. May also use Promise syntax
     */
    public deleteMany(keys: string[], callback?: (err: Error)=> void): Promise<void> {
        if (callback) {
            this._session.create().then(()=>{
                let promises = []
                keys.forEach((k)=>{
                    promises.push(this.delete(k))
                })
                Promise.all(promises).then(() => {
                    this._session.destroy((err) => {
                        if (err) {
                            callback(err)
                        } else {
                            callback(null)
                        }
                    })
                }).catch(err => callback(err))
            }).catch(err => callback(err))
        } else {
            return new Promise((resolve, reject)=> {
                this._session.create().then(()=>{
                    let promises = []
                    keys.forEach((k)=>{
                        promises.push(this.delete(k))
                    })
                    Promise.all(promises).then(() => {
                        this._session.destroy((err) => {
                            if (err) {
                                reject(err)
                            } else {
                                resolve()
                            }
                        })
                    }).catch(err => reject(err))
                }).catch(err => reject(err))
            })
        }
    }
}

export interface ConsulKvGetResponse {
    CreateIndex: number
    ModifyIndex: number
    LockIndex: number
    Key: string
    Flags: number
    Value: string
}