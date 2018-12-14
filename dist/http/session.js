"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Session {
    /**
     * Attaches a session to a consul client
     * @param client - The consul client to create a session for
     */
    constructor(client) {
        this._client = client;
        this._session_id = null;
    }
    /**
     * Returns the session id
     */
    getSessionId() {
        return this._session_id;
    }
    /**
     * Returns true if session is currently active
     */
    active() {
        return !(this._session_id == null);
    }
    /**
     * Creates a new consul session
     * @param callback - Optional callback function
     */
    create(callback) {
        if (callback)
            this._client.session.create((err, result) => {
                if (err) {
                    callback(err);
                }
                else {
                    this._session_id = result.ID;
                    callback(null, this._session_id);
                }
            });
        else
            return new Promise((resolve, reject) => {
                this._client.session.create((err, result) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        this._session_id = result.ID;
                        resolve(this._session_id);
                    }
                });
            });
    }
    /**
     * Destroys current consul session
     * @param callback - Optional callback function
     */
    destroy(callback) {
        if (callback)
            this._client.session.destroy(this._session_id, (err) => {
                if (err) {
                    callback(err);
                }
                else {
                    this._session_id = null;
                    callback();
                }
            });
        else
            return new Promise((resolve, reject) => {
                this._client.session.destroy(this._session_id)
                    .catch(reject)
                    .then(() => {
                    this._session_id = null;
                    resolve();
                });
            });
    }
}
exports.Session = Session;
