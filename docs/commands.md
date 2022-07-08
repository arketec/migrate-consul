# Command Reference for migrate-consul

### Quick Reference

| command | options                                                                                                                                                          | parameters                 | description                                                                                                                                                                                                                                                                                                                                                                                                                                   | example                                                             |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| help    |                                                                                                                                                                  |                            | prints help menu                                                                                                                                                                                                                                                                                                                                                                                                                              | migrate-consul help                                                 |
| version |                                                                                                                                                                  |                            | prints version                                                                                                                                                                                                                                                                                                                                                                                                                                | migrate-consul version                                              |
| init    | <br>--help<br>--debug                                                                                                                                            | [path] [migrationsDirName] | initializes migrations environment<br> -prints help menu<br> -prints verbose debug information                                                                                                                                                                                                                                                                                                                                                | [see #init](#init)                                                  |
| create  | <br>--help<br>--path <path><br>--configPath <path><br>--key <key><br>--value <value><br>--includeExamples<br>--import<br>--recurse<br>--token <token><br>--debug | <description>              | creates a new migration script<br> -prints help menu<br> -path to directory with migrations folder<br> -path to directory with config file<br> -key to auto-fill in migration<br> -value to auto-fill in migration<br> -print examples in migration script<br> -import value from existing consul key<br> -recursively create migrations from existing consul keys<br> -an ACL token (if not in config)<br> -prints verbose debug information | [see #create](#create)                                              |
| stage   | <br>--help<br>--path <path><br>--configPath <path><br>--author <name><br>--debug                                                                                 |                            | stages new migrations for deploy<br> -prints help menu<br> -path to directory with migrations folder<br> -path to directory with config file<br> -the author of the script<br> -prints verbose debug information                                                                                                                                                                                                                              | migrate-consul stage --author me                                    |
| up      | <br>--help<br>--path <path><br>--configPath <path><br>--force<br>--token <token><br>--debug                                                                      |                            | runs the up script on all pending migrations<br> -prints help menu<br> -path to directory with migrations folder<br> -path to directory with config file<br> -force script to run even if hash doesn't match<br> -an ACL token (if not in config)<br> -prints verbose debug information                                                                                                                                                       | migrate-consul up                                                   |
| down    | <br>--help<br>--path <path><br>--configPath <path><br>--last [n]<br>--force<br>--token <token><br>--debug                                                        |                            | runs the down script on the last n migrations<br> -prints help menu<br> -path to directory with migrations folder<br> -path to directory with config file<br> -rollback last n migrations, default 1<br> -force script to run even if hash doesn't match<br> -an ACL token (if not in config)<br> -prints verbose debug information                                                                                                           | migrate-consul down                                                 |
| unstage | <br>--help<br>--path <path><br>--configPath <path><br>--failed<br>--pending<br>--author <name><br>--debug                                                        |                            | unstages migrations<br> -prints help menu<br> -path to directory with migrations folder<br> -path to directory with config file<br> -unstages all failed migrations<br> -unstages all pending migrations<br> -unstages all migrations from author (non-completed)<br> -prints verbose debug information                                                                                                                                       | migrate-consul unstage --pending<br>migrate-consul unstage --failed |
| status  | <br>--help<br>--path <path><br>--configPath <path><br>--debug                                                                                                    |                            | prints the status of all migrations<br> -prints help menu<br> -path to directory with migrations folder<br> -path to directory with config file<br> -prints verbose debug information                                                                                                                                                                                                                                                         | migrate-consul status                                               |
| verify  | <br>--help<br>--path <path><br>--configPath <path><br>--diff [type]<br>--token <token><br>--debug                                                                | [type]                     | verifies up (default) or down scripts<br> -prints help menu<br> -path to directory with migrations folder<br> -path to directory with config file<br> -diff the current value in consul and print output<br> -token an ACL token (if not in config)<br> -prints verbose debug information                                                                                                                                                     | migrate-consul verify --diff<br>migrate-consul verify down          |
| backup  | <br>--help<br>--path <path><br>--configPath <path><br>--token <token><br>--debug                                                                                 | [..keys]                   | takes a backup from consul of provided keys<br> -prints help menu<br> -path to directory with migrations folder<br> -path to directory with config file<br> -an ACL token (if not in config)<br> -prints verbose debug information                                                                                                                                                                                                            | migrate-consul backup my/key                                        |
| restore | <br>--help<br>--path <path><br>--configPath <path><br>--date <date><br>--list<br>--last<br>--token <token><br>--debug                                            | [key]                      | restores backup to consul of provided key<br> -prints help menu<br> -path to directory with migrations folder<br> -path to directory with config file<br> -restore the key to this date<br> -list backups for key<br> -restore most recent backup<br> -an ACL token (if not in config)<br> -prints verbose debug information                                                                                                                  | migrate-consul restore my/key --last                                |

### Common Options

These options are available on all commands

#### help

Each command prints a sub-menu of options for the command with examples

#### path

Path to directory containing the migrations folders. Used when executing from a different location such as in certain CD/CI flows

#### configPath

Path to directory containing the migrate-consul-config.jsonc file. Useful when deploying to multiple environments

#### debug

Prints verbose debug information and passes a debug logger parameter to the scripts for logging inside your scripts

### Command Details

#### help

Prints main help menu

```sh
migrate-consul version 3.0.7

  version (v)     Output the version number
  backup (b)      backs up the consul value of the provided key
  create (c)      creates a new migration file in the migrations directory
  down (d)        runs the down migration for the last n completed migrations
  init (i)        Creates migration config file and migrations directory with a sample migration
  restore (r)     restores the consul value from the backup of the provided key
  stage (s)       stages the migrations for deployment
  status (stat)   print status of migrations
  unstage (un)    removes the migrations from deployment
  up (u)          runs the up migration for all staged migrations
  verify (ve)     validates the migration script. Can be used to test the script before running
  help (h)        -
```

#### version

Prints version

```sh
3.0.8
```

#### init

initializes migrations environment. Only need to run once

```sh
# prompt for init
migrate-consul init
? path: /path/to/migrations
? Name of migrations directory: migrations

# skip prompts and provide init
migrate-consul init /path/to/migrations migrations
```

#### create

Creates a template for a new migration script

```sh
# creates migration with default template
migrate-consul create my_description

# create migration with key filled in
migrate-consul create my_desciption --key path/to/key

# create migration with key and value filled in
migrate-consul create my_desciption --key path/to/key --value "my value"

# create migration with value from existing consul key
migrate-consul create my_desciption --key path/to/key --import

# create migration with value from existing consul key with ACL
migrate-consul create my_desciption --key path/to/key --import --token $CONSUL_ACL_TOKEN


# creates migration with default template and examples
migrate-consul create my_description --includeExamples

# recursivly creates multiple migrations for each key under existing consul path
migrate-consul create my_description --key path/to/root --import --recurse

```

#### stage

Adds migrations to mongodb and hashes migration to ensure changes are not made at this point

```sh
# stage all new migrations and adds author of script
migrate-consul stage --author myname

# stage all new migrations in a different directory with a different config
migrate-consul stage --author myname --configPath /path/to/config --path /path/to/migrations
```

#### unstage

Removes pending or failed migrations from mongodb

```sh
# unstages most recent pending migration
migrate-consul unstage

# unstages migration with provided name
migrate-consul unstage --file 2022070112654-my_migration.ts

# unstages all pending migration
migrate-consul unstage --pending

# unstages all failed migration
migrate-consul unstage --failed

# unstages all pending or failed migrations from author
migrate-consul unstage --author myname
```

#### verify

Runs script and prints output or errors to consul with optional diff from existing consul values

```sh
# verifies up script
migrate-consul verify

# verifies down script
migrate-consul verify down

# verifies up script and runs diff and prints diff patch
migrate-consul verify --diff patch

# verifies up script and runs diff and prints diff chars
migrate-consul verify --diff chars

# verifies up script and runs diff and prints diff words
migrate-consul verify --diff words

# verifies up script and runs diff and prints diff lines
migrate-consul verify --diff lines

# verifies up script and runs diff and prints diff json
migrate-consul verify --diff json
```

#### up

Runs all pending migrations up script

```sh
# run all pending
migrate-consul up

# forces run up even if hashes don't match (they have been edited without re-staging)
migrate-consul up --force

# run all pending migrations in a different directory with a different config
migrate-consul up --configPath /path/to/config --path /path/to/migrations
```

#### down

Runs down script on migrations per options

```sh
# runs down script of last migration
migrate-consul down

# runs down script of last 2 migrations
migrate-consul down --last 2

# runs down script of last 5 migrations
migrate-consul down --last 5

# run last down migration in a different directory with a different config
migrate-consul down --configPath /path/to/config --path /path/to/migrations
```

#### status

Prints a table of the status of all migrations

```sh
# print all statuses
migrate-consul status
```

#### backup

Takes a backup of the provided keys and store them in mongo with a timestamp

```sh
# backup a single key
migrate-consul backup my/key

# backup multiple keys
migrate-consul backup my/key my/other/key
```

#### restore

Restores key to consul from backup

```sh
# lists backups for key
migrate-consul restore my/key --list

# restore last backup for key
migrate-consul restore my/key --last

# restore backup from date
migrate-consul restore my/key --date 2022-07-08T01:48:18.183Z
```
