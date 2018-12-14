import * as consul from 'consul'

export class Session {
    private _client: consul.Consul
    private _session_id: string
    
    /**
     * Attaches a session to a consul client
     * @param client - The consul client to create a session for
     */
    constructor(client: consul.Consul) {
        this._client = client
        this._session_id = null
    }

    /**
     * Returns the session id
     */
    public getSessionId(): string {
        return this._session_id;
    }

    /**
     * Returns true if session is currently active
     */
    public active(): boolean {
        return !(this._session_id == null)
    }
    
    /**
     * Creates a new consul session
     * @param callback - Optional callback function
     */
    public create(callback?: (err? : Error, session_id?: string) => void | undefined): Promise<string> {
        if (callback)
            this._client.session.create((err, result: ISessionCreateResponse) => {
                if (err) {
                    callback(err)
                } else {
                    this._session_id = result.ID
                    callback(null, this._session_id)
                }
            });
        else
            return new Promise<string>((resolve, reject)=> {
                this._client.session.create((err, result: ISessionCreateResponse) => {
                    if (err) {
                        reject(err)
                    } else {
                        this._session_id = result.ID
                        resolve(this._session_id)
                    }
                });
            });
    }

    /**
     * Destroys current consul session
     * @param callback - Optional callback function
     */
    public destroy(callback?: (err? : Error) => void | undefined): Promise<void> {
        if (callback)
            this._client.session.destroy(this._session_id, (err) => {
                if (err) {
                    callback(err)
                } else {
                    this._session_id = null
                    callback()
                }
            });
        else
            return new Promise<void>((resolve, reject)=> {
                this._client.session.destroy(this._session_id)
                    .catch(reject)
                    .then(() => {
                        this._session_id = null
                        resolve()
                    })
            });
    }
}

export interface ISessionCreateResponse {ID: string}