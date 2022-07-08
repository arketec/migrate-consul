# migrate-consul

migrate-consul is a migration assistant for Consul KV that features:

    - Migration script generation and processing
    - Ability to run up and down migrations
    - Ability to edit json values with jsonpath
    - Migration history stored in mongodb
    - Ability to verify scripts and diff the output with the existing values
    - Ability to backup keys
    - Restore keys by date
    - Now can write scripts in Typescript!

[jsonpath documentation](https://support.smartbear.com/alertsite/docs/monitors/api/endpoint/jsonpath.html)

# Requirements

[MongoDB v3+](https://www.mongodb.com/)

[NodeJs v16+](https://nodejs.org/en/)

[Typescript](https://www.typescriptlang.org/)

### Recommended for editing scripts

[VSCode](https://code.visualstudio.com/)

# Installation

```sh
# yarn
yarn global add migrate-consul

# npm
npm i -g migrate-consul
```

# Quickstart

```sh
# create a directory to store your migrations and cd to it
mkdir consul_migrations && cd consul_migrations

# initialize the project and enter the details in the prompt
migrate-consul init
? path: /path/to/consul_migrations
? Name of the migrations directory: migrations

> Edit the generated config file at /path/to/consul_migrations/migrate-consul-config.jsonc
```

#### migrate-consul-config.jsonc

```jsonc
{
  // configure mongodb
  "database": {
    "host": "localhost",
    "port": "27017",
    "dbname": "consul_migrations"
  },

  // configure consul agent
  "consul": {
    "host": "localhost",
    "port": "8500",
    "secure": false,
    "acl": false,
    "aclTokenEnvVar": ""
  },
  // configure script generation options
  "generation": {
    "printExamples": true,
    "generateTypesFromKeys": false,
    "includeTypes": true
  },
  // configure verify --diff options
  "diff": {
    "maxDiffLength": 10000,
    "colors": {
      "bg": "bgCyan",
      "added": "green",
      "removed": "red",
      "unchanged": "grey"
    }
  },
  // environment config
  "migrationsDirectory": "migrations",
  "environment": "local",
  "debug": false
}
```

```sh
# create a new migration
migrate-consul create my_test_migration
> Generated migration file at /path/to/consul_migrations/migrations/20220701123423-my_test_migration.ts
```

#### 20220701123423-my_test_migration.ts

```ts
import { IMigrationClient, Consul } from '../types/types'
export default {
  up: async (consul: IMigrationClient, env: string, client: Consul.Consul) => {
    // write your migration here. Must be awaited or return Promise

    await consul.key(`sample`).val(`Hello from migrate-consul`).save()
  },
  down: async (
    consul: IMigrationClient,
    env: string,
    client: Consul.Consul
  ) => {
    // write your rollback here. Must be awaited or return Promise

    await consul.key(`sample`).drop()
  },
}
```

```sh
# stage migration for deployment
migrate-consul stage --author me
> staged 20220701123423-my_test_migration.ts

# verify the script is valid
migrate-consul verify
> verified 20220701123423-my_test_migration.ts

# shows status of migrations
migrate-consul status
┌────────────────────────────────────────────────────────────────────────────────────┬──────────┬─────────┬─────────────────┬───────────────────────────────────────────────────────────┬───────────────────────────────────────────────────────────┐
│ Name                                                                               │ Author   │ Status  │ Last Changed By │ Date of Last Change                                       │ Date Migration Applied                                    │
├────────────────────────────────────────────────────────────────────────────────────┼──────────┼─────────┼─────────────────┼───────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────┤
│ 20220701123423-my_test_migration.ts                                                    │ me │ PENDING │         │ Fri Jul 1 2022 17:51:18 GMT-0800 (Pacific Standard Time) │                                                           │


# run the migration up
migrate-consul up
> migrated up 20220701123423-my_test_migration.ts

# rollback the migration
migrate-consul down
> migrated down 20220701123423-my_test_migration.ts

# unstage last migration
migrate-consul unstage
> unstaged 20220701123423-my_test_migration.ts

```

# Commands

[See Commands](./docs/commands.md)

# Migrations

```ts
up: (consul: IMigrationClient, env: string, client: Consul.Consul) {
    // migrate a key with a string val
    await consul.key('my_key').val('hello from migrate-consul').save()

    // migrate a different value per env (env parameter is set in config file)
    const envs = {
        dev: 'localhost', // ex: migrate-consul-config.jsonc ."environment": "dev"
        production: 'api.mysite.com' // ex: migrate-consul-config.jsonc ."environment": "production"
    }
    await consul.key('host').val(envs[env]).save()

    // migrate a key with a JSON val
    await consul.key('my_json_key').val({
        a: 1,
        nested: {
            b: 'string'
        }
    }).save()
    // output
    //{
    //    "a: 1,
    //    "nested": {
    //        "b": "string"
    //    }
    //}

    // edit a JSON value
    await consul.key('my_json_key').jsonpath('$.nested.b').val('new string').save()
    // output
    //{
    //    "a": 1,
    //    "nested": {
    //        "b": "new string"
    //    }
    //}

    // use the consul client directly for more advanced operations (https://www.npmjs.com/package/consul)
    const lock = client.lock({key: 'my_key'})
    lock.on('acquire', function() {
        console.log('lock acquired');

        lock.release();
    });

    lock.on('release', function() {
        console.log('lock released');
    });

    lock.acquire();
}
```

```ts
down: (consul: IMigrationClient, env: string, client: Consul.Consul) {
    // delete a key
    await consul.key('my_key').drop()

    // delete a value from JSON
    await consul.key('my_json_key').jsonpath('$.nested.b').drop()
    // output
    //{
    //    "a": 1,
    //    "nested": {}
    //}
}
```

# License

MIT - see LICENSE
