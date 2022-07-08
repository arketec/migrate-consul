import Mongoose = require('mongoose')

import { Config } from '../util/Config'
import { readFileSync } from 'fs'

Mongoose.Promise = global.Promise

class MongooseAccess {
  public static mongooseInstance: any
  public static mongooseConnection: Mongoose.Connection

  public async disconnect(): Promise<void> {
    if (MongooseAccess.mongooseInstance) await Mongoose.disconnect()
  }
  public async connect(configPath: string): Promise<MongooseAccess> {
    if (MongooseAccess.mongooseInstance) {
      return MongooseAccess.mongooseInstance
    }
    const config = Config.tryLoadSync(
      {
        read: (path) => readFileSync(path, 'utf8'),
        readAsync: () => undefined,
      },
      `${configPath}/migrate-consul-config.jsonc`
    )

    const connectionString = config
      ? config.database.connectionString ??
        `mongodb://${config.database.host}:${config.database.port}/${config.database.dbname}`
      : 'mongodb://localhost:27017/consul_migrations'
    MongooseAccess.mongooseConnection = Mongoose.connection

    MongooseAccess.mongooseConnection.once('open', () => {
      if (config?.debug) console.log('Connect to an mongodb is opened.')
    })

    MongooseAccess.mongooseInstance = await Mongoose.connect(connectionString)

    MongooseAccess.mongooseConnection.on('connected', () => {
      if (config?.debug)
        console.log('Mongoose default connection open to ' + connectionString)
    })

    // If the connection throws an error
    MongooseAccess.mongooseConnection.on('error', (msg) => {
      if (config?.debug)
        console.log('Mongoose default connection message:', msg)
    })

    // When the connection is disconnected
    MongooseAccess.mongooseConnection.on('disconnected', () => {
      setTimeout(() => {
        MongooseAccess.mongooseInstance = Mongoose.connect(connectionString)
      }, 10000)
      if (config?.debug)
        console.log('Mongoose default connection disconnected.')
    })

    // When the connection is reconnected
    MongooseAccess.mongooseConnection.on('reconnected', () => {
      if (config?.debug)
        console.log('Mongoose default connection is reconnected.')
    })

    // If the Node process ends, close the Mongoose connection
    process.on('SIGINT', () => {
      MongooseAccess.mongooseConnection.close(() => {
        if (config?.debug)
          console.log(
            'Mongoose default connection disconnected through app termination.'
          )
        process.exit(0)
      })
    })

    return this
  }
}

export { MongooseAccess }
