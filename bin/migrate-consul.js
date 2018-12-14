#! /usr/bin/env node

/**
 * migrate-consul
 * Noah Maughan, BTIS Inc
 * 
 * Description:
 * A migration utility for managing changes in Consul KV. 
 * 
 * Requires: 
 * nodejs 10.6+
 * mongodb 3+
 * consul v1.2+
 * 
 * Usage:
 *  migrate-consul command [options] [parameters]
 * 
 * Commands:
 *  init [-F --force]                                                          initialize a new migration project and generates a config file in the root directory
 *                                                                                  -F, --force         option to delete and re-generate config file
 *  create [-f --file <filename>] <description>                                create a new consul migration with the provided description
 *                                                                                  -f, --file          option to provide a config file from a custom location
 *  stage [-f --file <filename>, -i --input <input>, -a --author <author>]     stages all migrations in the configured directory, unless input specified
 *                                                                                  -f, --file          option to provide a config file from a custom location
 *                                                                                  -i, --input         option to provide path to migration file to stage
 *                                                                                  -a, --author        option to provide script author
 *  restage [-f --file <filename>, -i --input <input>, -c <changedBy>]         re-stages last failed migration, unless input specified
 *                                                                                  -f, --file          option to provide a config file from a custom location
 *                                                                                  -i, --input         option to provide path to migration file to stage
 *                                                                                  -c, --changedBy     option to provide user who runs this job
 *  up [-f --file <filename>, -c --changedBy <changedBy>, -s --stage]          create a new consul migration with the provided description
 *                                                                                  -f, --file          option to provide a config file from a custom location
 *                                                                                  -c, --changedBy     option to provide user who runs this job
 *                                                                                  -s, --stage         option to stage all unstaged migrations before running
 *  down [-f --file <filename>, -c --changedBy <changedBy>]                    create a new consul migration with the provided description
 *                                                                                  -f, --file          option to provide a config file from a custom location
 *                                                                                  -c, --changedBy     option to provide user who runs this job
 *  status [-f <filename>, -s <statusType>, -c <changedBy>, -a <author>]       create a new consul migration with the provided description
 *                                                                                  -f, --file          option to provide a config file from a custom location
 *                                                                                  -s, --statusType    option to filter on status type
 *                                                                                  -c, --changedBy     option to filter on user who run the scripts
 *                                                                                  -a, --author        option to filter on script author
 * Key:
 * [--optional_flag] 
 * [optional_argument] 
 * <required_argument> 
 * [--optional_flag <required_parameter>]
 */

 const migrator = require('../dist/index')
 const program = require('commander')
 const mongoose = require('mongoose')
 const colors = require('colors')
 const _ = require("lodash");
 const Table = require('cli-table2');
 const version = require('../package.json').version
 const ConfigIO = migrator.ConfigIO
 const Status = migrator.Status

 const actions = new migrator.Actions()

 function printReport(results) {
     
     var table = new Table({
         head: ['Name', 'Author', 'Status', 'Last Changed By', 'Date of Last Change', 'Date Migration Applied']
     })

     results.forEach(row => {
         table.push([row.name, row.script_author, Status[row.status], row.changed_by, (row.date_last_changed ? row.date_last_changed.toString(): ''), (row.date_applied ? row.date_applied.toString() : '')])
     })
     console.log(table.toString())
 }
 
 program.version(version)
 
 program.command("init")
    .description("initialize a new migration project and generates a config file in the root directory")
    .option("-F --force", "option to delete and re-generate config file")
    .action((options) => {
        actions
            .init(options.force)
            .then(() =>
                console.log(
                    `Initialization successful. Please edit the generated '${ConfigIO.getName()}' file located at '${ConfigIO.getPath()}'`.green
                )
            )
        .catch(err => 
            console.log(err.toString().red))
    });

program
    .command("create <description>")
    .description("create a new consul migration with the provided description")
    .option("-f --file <file>", "option to provide a config file from a custom location")
    .action((description, options) => {
        if (options.file) {
            global['configFile'] = options.file
        }
        actions
            .create(description)
            .then(fileName =>
                console.log(
                `Created: ${ConfigIO.load().migrations_directory}/${fileName}`.green
                )
            )
            .catch(err => console.log(err.toString().red));
    });

program
    .command("stage")
    .description("stage all new consul migrations")
    .option("-f --file <file>", "option to provide a config file from a custom location")
    .option("-i --input <input>", "option to specify a single migration file to stage")
    .option("-a --author <author>", "option to specify the author of the script")
    .action((options) => {
        if (options.file) {
            global['configFile'] = options.file
        }
        global['options'] = ConfigIO.load()
        let config = global['options']
        mongoose.connect(`mongodb://${config.database.host}:${config.database.port}/${config.database.dbname}`, { useNewUrlParser: true })
        actions.stage(options.author, options.input).then(results => {
            if (results.length)
                results.forEach(name => console.log(('Staged ' + name).green))
            else
                console.log('No new migrations found'.yellow)
            mongoose.disconnect()
            process.exit()
        }).catch(err => {console.log(err.toString().red); process.exit(1)})
    });

program
    .command("up")
    .description("run all pending consul migrations. Use --stage flag to stage all new migrations prior to running")
    .option("-s --stage", "option to stage all unstaged migrations before running")
    .option("-f --file <file>", "option to provide a config file from a custom location")
    .option("-c --changedBy <changedBy>", "option to provide user who runs this job")
    .action((options) => {
        if (options.file) {
            global['configFile'] = options.file
        }
        global['options'] = ConfigIO.load()
        let config = global['options']
        mongoose.connect(`mongodb://${config.database.host}:${config.database.port}/${config.database.dbname}`, { useNewUrlParser: true })
        if (options.stage) {
            actions.stage(options.changedBy).then(()=> actions.up(options.changedBy).then(results => {
                results.forEach(name =>  console.log(('Migrated ' + name).green))
                mongoose.disconnect()
            }).catch(err => {console.log(err.toString().red); process.exit(1)})).catch(err => {console.log(err.toString().red); process.exit(1)})
        } else
            actions.up(options.changedBy).then(results => {
                results.forEach(name =>  console.log(('Migrated ' + name).green))
                mongoose.disconnect()
            }).catch(err => {console.log(err.toString().red); process.exit(1)})
    });

program
    .command("down")
    .description("undo the last applied consul migration")
    .option("-f --file <file>", "option to provide a config file from a custom location")
    .option("-c --changedBy <changedBy>", "option to provide user who runs this job")
    .action((options) => {
        if (options.file) {
            global['configFile'] = options.file
        }
        global['options'] = ConfigIO.load()
        let config = global['options']
        mongoose.connect(`mongodb://${config.database.host}:${config.database.port}/${config.database.dbname}`, { useNewUrlParser: true })
        actions.down(options.changedBy).then(name => {
            console.log(('Rolled back ' + name).green)
            mongoose.disconnect()
        }).catch(err => {console.log(err.toString().red); process.exit(1)})
    });

program
    .command("status")
    .description("print the status of the migrations with optional filters")
    .option("-f --file <file>", "option to provide a config file from a custom location")
    .option("-s --statusType <statusType>", "filter on status types: Pending, Failed, Complete, Deleted")
    .option("-a --author <author>", "filter on scripts written by author")
    .option("-c --changedBy <changedBy>", "filter on scripts changed by user")
    .action((options) => {
        if (options.file) {
            global['configFile'] = options.file
        }
        global['options'] = ConfigIO.load()
        let config = global['options']
        mongoose.connect(`mongodb://${config.database.host}:${config.database.port}/${config.database.dbname}`, { useNewUrlParser: true })
        let status
        if (options.statusType) {
            status = Status[options.statusType.toUpperCase()]
        }
        actions.reports(status, options.author, options.changedBy).then(results => {
            printReport(results)
            mongoose.disconnect()
        })
        
    });

program
    .command("restage")
    .description("undo the last applied consul migration")
    .option("-f --file <file>", "option to provide a config file from a custom location")
    .option("-c --changedBy <changedBy>", "option to provide user who runs this job")
    .option("-i --input <input>", "option to provide name of script to re-stage")
    .option("-s --statusType <statusType>", "option to restage latest in provided status")
    .action((options) => {
        if (options.file) {
            global['configFile'] = options.file
        }
        global['options'] = ConfigIO.load()
        let config = global['options']
        mongoose.connect(`mongodb://${config.database.host}:${config.database.port}/${config.database.dbname}`, { useNewUrlParser: true })
        actions.restage(options.input, options.changedBy, options.statusType).then(name => {
            console.log(('Re-staged ' + name).green)
            mongoose.disconnect()
        }).catch(err => {console.log(err.toString().red); process.exit(1)})
    });


program.parse(process.argv)

if (_.isEmpty(program.args)) {
    program.outputHelp();
  }