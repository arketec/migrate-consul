import { Client } from './../http/client';
const DEFAULT_CONFIG_FILENAME = 'migrate-consul-config.js'
const DEFAULT_MIGRATIONS_DIR_NAME = "migrations";

import * as path from 'path'
import { get } from 'lodash'

export class ConfigIO {
    /**
     * Gets the path of the config file
     */
    public static getPath(): string {
        let userDefinedConfig = get(global, 'configFile')
        if (!userDefinedConfig)
            return path.join(process.cwd(), DEFAULT_CONFIG_FILENAME)
        else {
            if (path.isAbsolute(userDefinedConfig)) {
                return userDefinedConfig;
            } else {
                return path.join(process.cwd(), userDefinedConfig)
            }
        }
    }

    /**
     * Gets the name of the config file
     */
    public static getName(): string {
        return path.basename(this.getPath())
    }

    /**
     * Loads the config file
     */
    public static load(): IConfigFile {
        return require(this.getPath()).default
    }
}

export class MigrationsIO {
    /**
     * Gets the path of the migration directory
     */
    public static getPath(): string {
        let dir
        try {
            dir = ConfigIO.load().migrations_directory
            if (!dir) {
                dir = DEFAULT_MIGRATIONS_DIR_NAME
            }
        } catch (err) {
            dir = DEFAULT_MIGRATIONS_DIR_NAME
        }

        if (path.isAbsolute(dir)) {
            return dir
        } else {
            return path.join(process.cwd(), dir)
        }
    }

    /**
     * Loads the migration script
     * @param file - The name of the migration script
     */
    public static load(file): IMigration {
        return require(path.join(this.getPath(), file)).default
    }
}

export interface IConfigFile {
    database: {host: string, port: number, dbname: string},
    consul: {host: string, port: number, ssl: boolean},
    migrations_directory: string,
    environment: string
}

export interface IMigration {
    up: (consul: Client, env: string, done) => void,
    down: (consul: Client, env: string, done) => void
}

export {DEFAULT_CONFIG_FILENAME, DEFAULT_MIGRATIONS_DIR_NAME}