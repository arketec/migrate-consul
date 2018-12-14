"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DEFAULT_CONFIG_FILENAME = 'migrate-consul-config.js';
exports.DEFAULT_CONFIG_FILENAME = DEFAULT_CONFIG_FILENAME;
const DEFAULT_MIGRATIONS_DIR_NAME = "migrations";
exports.DEFAULT_MIGRATIONS_DIR_NAME = DEFAULT_MIGRATIONS_DIR_NAME;
const path = require("path");
const lodash_1 = require("lodash");
class ConfigIO {
    /**
     * Gets the path of the config file
     */
    static getPath() {
        let userDefinedConfig = lodash_1.get(global, 'configFile');
        if (!userDefinedConfig)
            return path.join(process.cwd(), DEFAULT_CONFIG_FILENAME);
        else {
            if (path.isAbsolute(userDefinedConfig)) {
                return userDefinedConfig;
            }
            else {
                return path.join(process.cwd(), userDefinedConfig);
            }
        }
    }
    /**
     * Gets the name of the config file
     */
    static getName() {
        return path.basename(this.getPath());
    }
    /**
     * Loads the config file
     */
    static load() {
        return require(this.getPath()).default;
    }
}
exports.ConfigIO = ConfigIO;
class MigrationsIO {
    /**
     * Gets the path of the migration directory
     */
    static getPath() {
        let dir;
        try {
            dir = ConfigIO.load().migrations_directory;
            if (!dir) {
                dir = DEFAULT_MIGRATIONS_DIR_NAME;
            }
        }
        catch (err) {
            dir = DEFAULT_MIGRATIONS_DIR_NAME;
        }
        if (path.isAbsolute(dir)) {
            return dir;
        }
        else {
            return path.join(process.cwd(), dir);
        }
    }
    /**
     * Loads the migration script
     * @param file - The name of the migration script
     */
    static load(file) {
        return require(path.join(this.getPath(), file)).default;
    }
}
exports.MigrationsIO = MigrationsIO;
