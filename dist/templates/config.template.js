"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    // configure mongodb server here
    database: {
        host: 'localhost',
        port: 27017,
        dbname: 'consul_migrations',
        environment: 'local'
    },
    //configure consul server here
    consul: {
        host: 'localhost',
        port: 8500,
        ssl: false // SSL features are not yet implemented
    },
    // set the name of the migration directory
    migrations_directory: 'migrations'
};
