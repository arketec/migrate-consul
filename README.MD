# migrate-consul

[![Build Status](http://mcc-build-linux01:8080/static/b99b620d/images/48x48/blue.png)](http://mcc-build-linux01:8080/job/Consul-Migrations/)

migrate-consul is a migration assistant for Consul KV that features:

  - Migration script generation and processing
  - Ability to run up and down migrations in a locked session
  - A file and mongodb-backed migration history

Consul KV is a distrubuted Key-Value store that can be used to distribute various key/value pairs to other systems in the Consul network for uses such as configuration settings. However, there is not a built-in way to manage the changes made to such KV pairs. migrate-consul attempts to solve this issue by doing the following:

  - Generating a migration script that can be used to set or delete KV pairs, including new and existing
  - Adding these script to a staging area inside a MongoDB database
  - Running all PENDING migrations in order of timestamp inside an exclusive locked session
  - Retaining a history along with a hash of all migration files ran
  - Provides the ability to rollback the last applied migration by timestamp
  - Tracks the author of the script as well as the user that last ran the migration

### Required Dependencies

migrate-consul uses a number of open source projects to work properly:

* [node.js] - evented I/O for the runtime (installed separately)
* [consul] - distributed service mesh used as a KV store (installed separately)
* [mongodb] - NoSQL open source document database (installed separately)
* [mongoose] - ODM for ease of using mongodb from node.js
* [lodash] - functional library for working with collections
* [commander] - library for creating CLI apps in node.js
* [colors] - library to ease CLI output in node.js

### Installation

migrate-consul requires [Node.js](https://nodejs.org/) v10+ as well as [mongodb] v3.6+ to run.

Install *migrate-consul* globally with the command

```sh
$ npm install -g migrate-consul
```

Update if needed:
```sh
$ npm update -g migrate-consul
```


### Development

Development of this app requires a few more dependencies:
    
* [typescript] - a typed superset of Javascript that compiles to plain Javascript
* [ts-node] - REPL for typescript
* [mocha] - unit test framework for node.js
* [chai] - assertion library for mocha

#### Usage

1) Create a directory and cd to it (i'm using 'consul_keys' here)
```sh
$ mkdir consul_keys
$ cd consul_keys
```
2) Run initialization if this is the first time using migrate-consul
```sh
$ migrate-consul init
Initialization successful. Please edit the generated 'migrate-consul-config.js' file located at '/home/user/samples/migrate-consul-config.js'
```
3) Optionally, update the generated config file if you like
```javascript
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
        ssl: false // SSL features are not yet implemented
    },
    // set the name of the migration directory
    migrations_directory: 'migrations',
    environment: 'dev'
};
```
4) Once the config is to your liking, create a new migration with a description

```sh
$ migrate-consul create first_migration
Created migrations/20181126912548-first_migration.js
```

5) Edit the generated migration file to create both an up and down migration (be sure to pass 'done' to the callback parameter!)
```javascript
exports.default = {
    up: (consul, env, done) => {
        consul.set('Sample_Key', 'sample value', done)
    },
    down: (consul, env, done) => {
        consul.delete('Sample_Key', done)
    }
};
```

6) Repeate steps 4 and 5 for any other migrations you would like, or continue to step 7

7) Once all migration scripts are complete, save and then stage the migrations and (optionally) provide the user
```sh
$ migrate-consul stage --author nmaughan
Staged migrations/20181126912548-first_migration.js
```

8) Run the migration. (Note: You may also do steps 7 and 8 in the same step by passing the flag --stage to up)
```sh
$ migrate-consul up --changedBy nmaughan
Migrated migrations/20181126912548-first_migration.js
```

example with --stage:
```sh
$ migrate-consul up --stage --changedBy nmaughan
Staged migrations/20181126912548-first_migration.js
Migrated migrations/20181126912548-first_migration.js
```

9) That's it. If you want to rollback, then simple run the down script (assuming you provided one)
```sh
$ migrate-consul down --changedBy nmaughan
Rolled back migrations/20181126912548-first_migration.js
```

To reset the last failed migration, use restage:
```sh
$ migrate-consul restage --changedBy nmaughan
Re-staged migrations/20181126912548-first_migration.js
```

You may also provide the filename or status to restage:
```sh
$ migrate-consul restage --changedBy nmaughan --input 20181126912548-first_migration.js
Re-staged migrations/20181126912548-first_migration.js
```
```sh
$ migrate-consul restage --changedBy nmaughan --statusType completed
Re-staged migrations/20181126912548-first_migration.js
```
*Note: Re-staging any completed or deleted statusTypes will check the hash of the script. If the script changed, migration will not run*

To check the status of migrations, you can use the status command:
```sh
$ migrate-consul status
┌─────────────────────────────────┬────────┬───────────┬─────────────────┬─────────────────────────────────────────┬─────────────────────────────────────────┐
│ Name                            │ Author │ Status    │ Last Changed By │ Date of Last Change                     │ Date Migration Applied                  │
├─────────────────────────────────┼────────┼───────────┼─────────────────┼─────────────────────────────────────────┼─────────────────────────────────────────┤
│ 20181129912335-a-new-start.js   │ josh   │ COMPLETED │ nmaughan        │ Thu Nov 29 2018 01:26:42 GMT-0800 (PST) │ Thu Nov 29 2018 01:26:42 GMT-0800 (PST) │
├─────────────────────────────────┼────────┼───────────┼─────────────────┼─────────────────────────────────────────┼─────────────────────────────────────────┤
│ 20181126912548-first.js         │ noah   │ PENDING   │                 │                                         │                                         │
└─────────────────────────────────┴────────┴───────────┴─────────────────┴─────────────────────────────────────────┴─────────────────────────────────────────┘
```

You can also filter based on status, author, and changed by:
```sh
$ migrate-consul status --statusType PENDING --author noah
┌─────────────────────────────────┬────────┬───────────┬─────────────────┬─────────────────────────────────────────┬─────────────────────────────────────────┐
│ Name                            │ Author │ Status    │ Last Changed By │ Date of Last Change                     │ Date Migration Applied                  │
├─────────────────────────────────┼────────┼───────────┼─────────────────┼─────────────────────────────────────────┼─────────────────────────────────────────┤
│ 20181126912548-first.js         │ noah   │ PENDING   │                 │                                         │                                         │
└─────────────────────────────────┴────────┴───────────┴─────────────────┴─────────────────────────────────────────┴─────────────────────────────────────────┘
```

#### Additional Features

- Build consul query with the QueryFactory:
```javascript
exports.default = {
    up: (consul, env, done) => {
        consul.key('Sample_Key').val('sample value').save(done)
    },
    down: (consul, env, done) => {
        consul.key('Sample_Key').drop(done)
    }
};
```

- Update a JSON value using the JPath:
```javascript
exports.default = {
    up: (consul, env, done) => {
        consul.key('Sample_Key').jpath('a.b.c').val('sample value').save(done)
    },
    down: (consul, env, done) => {
        consul.key('Sample_Key').jpath('a.b.c').val('old value').save(done)
    }
};
```

Result:
```
{
    "a": {
        "b": {
            "c": "sample value"
        }
    }
}
```

- Add multiple JSON properties using the JPaths:
```javascript
exports.default = {
    up: (consul, env, done) => {
        consul.key('Sample_Key')
            .jpath('a.b.c').val('sample value')
            .jpath('a.e.f').val('other value')
            .save(done)
    },
    down: (consul, env, done) => {
        consul.key('Sample_Key')
            .jpath('a.b.c')
            .jpath('a.e.f')
            .drop(done)
    }
};
```

Result:
```
{
    "a": {
        "b": {
            "c": "sample value"
        },
        "e": {
            "f": "other value"
        }
    }
}
```

- Use the provided env variable. env is filled by the 'environment' field in the config
```javascript
exports.default = {
    up: (consul, env, done) => {
        switch(env) {
            case 'dev':
                consul.set('Test_Key', 'dev value', done)
                break;
            default:
                consul.set('Test_Key', 'default value', done)
                break;
        }
    },
    down: (consul, env, done) => {
        switch(env) {
            case 'dev':
                consul.set('Test_Key', 'old dev value', done)
                break;
            default:
                consul.set('Test_Key', 'old default value', done)
                break;
        }
    }
};
```

### Future Release Features

 - Ability to use a secure TLS connection
 - Better flexibility in migration script

License
----

[MIT](https://opensource.org/licenses/MIT)

[//]: <> (Required Dependencies)
   [node.js]: <http://nodejs.org>
   [consul]: <https://www.npmjs.com/package/consul>
   [mongodb]: <https://www.mongodb.com>
   [mongoose]: <https://www.npmjs.com/package/mongoose>
   [lodash]: <https://lodash.com>
   [commander]: <https://www.npmjs.com/package/commander>
   [colors]: <https://www.npmjs.com/package/colors>
   
[//]: <> (Dev Dependencies)
   [typescript]: <https://www.typescriptlang.org>
   [ts-node]: <https://www.npmjs.com/package/ts-node>
   [mocha]: <https://www.npmjs.com/package/mocha>
   [chai]: <https://www.npmjs.com/package/chai>
   
   
   
