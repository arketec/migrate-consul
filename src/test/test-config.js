exports.default = {
    // configure mongodb server here
    database: {
        host: 'localhost',
        port: 27017,
        dbname: 'consul_migrations'
    },

    //configure consul server here
    consul: {
        host: 'localhost',
        port: 8500,
        ssl: false
    },

    // set the name of the migration directory
    migrations_directory: 'migrations'
}