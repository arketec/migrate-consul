"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("./../../constants/database");
const chai = require("chai");
const mongoose = require("mongoose");
const mongo_adapter_1 = require("./../../data_access/mongo_adapter");
const date_1 = require("../../util/date");
global['options'] = {
    configFile: 'src/test/test-config.js'
};
const expect = chai.expect;
before((done) => {
    console.log('creating test db "migrate-consul-test"');
    console.log('connecting...');
    mongoose.connect('mongodb://localhost:27017' + '/migrate-consul-test', (err) => {
        if (err) {
            console.log('..failed to connect! Please ensure mongodb is installed');
            done(err);
        }
        else {
            console.log('..connected!');
            done();
        }
    });
});
describe('mongo adapter migration tests', () => {
    let migrationName = date_1.nowAsString() + '_sample_migration';
    let migration = new mongo_adapter_1.MigrationInstance(migrationName);
    let userName = 'test user';
    it('should create a migration entry', (done) => {
        migration.add('test dev').then(m => {
            expect(m).to.have.property('status');
            expect(m.status).to.equal(database_1.Status.PENDING);
            expect(m).to.have.property('date_added');
            expect(m.date_added).to.be.a('Date');
            done();
        }).catch(done);
    });
    it('should apply a migration entry', (done) => {
        migration.apply('ljalsjdlkajsdjalkajsdlkaslkdjalkajsdl', userName).then(numEntries => {
            expect(numEntries.nModified).to.equal(1);
            done();
        }).catch(done);
    });
    it('should mark a migration entry failed', (done) => {
        migration.updateStatus(database_1.Status.FAILED, userName).then(numEntries => {
            expect(numEntries.nModified).to.equal(1);
            done();
        }).catch(done);
    });
    it('should mark a migration entry deleted', (done) => {
        migration.updateStatus(database_1.Status.DELETED, userName).then(numEntries => {
            expect(numEntries.nModified).to.equal(1);
            done();
        }).catch(done);
    });
});
describe('mongo adapter multiple entries', () => {
    let migrations = [];
    for (var i = 0; i < 10; i++) {
        migrations.push(new mongo_adapter_1.MigrationInstance(date_1.nowAsString() + '_sample_migration' + i));
    }
    let userName = 'test user';
    it('should create a few migrations', (done) => {
        migrations.forEach(migration => {
            migration.add('test dev').then(m => {
                expect(m).to.have.property('status');
                expect(m.status).to.equal(database_1.Status.PENDING);
                expect(m).to.have.property('date_added');
                expect(m.date_added).to.be.a('Date');
            }).catch(err => {
                done(err);
                return;
            });
        });
        done();
    });
    it('should apply some of the migrations', (done) => {
        for (var i = 0; i < migrations.length / 2; i++) {
            var migration = migrations[i];
            migration.apply('ljalsjdlkajsdjalkajsdlkaslkdjalkajsdl', userName).then(numEntries => {
                expect(numEntries.nModified).to.equal(1);
            }).catch(err => {
                done(err);
                return;
            });
        }
        done();
    });
    it('should mark the others failed', (done) => {
        for (var i = migrations.length / 2; i < migrations.length; i++) {
            var migration = migrations[i];
            migration.updateStatus(database_1.Status.FAILED, userName).then(numEntries => {
                expect(numEntries.nModified).to.equal(1);
            }).catch(err => {
                done(err);
                return;
            });
        }
        done();
    });
});
describe('mongo adapter reports tests', () => {
    it('should query the current status of migrations', (done) => {
        new mongo_adapter_1.MigrationReports().getCurrent().then(results => {
            expect(results).to.be.an('array');
            expect(results.length).to.be.greaterThan(0);
            done();
        }).catch(done);
    });
    it('should query the completed migrations', (done) => {
        new mongo_adapter_1.MigrationReports().get({ status: database_1.Status.COMPLETED }).then(results => {
            expect(results).to.be.an('array');
            expect(results.length).to.be.greaterThan(0);
            done();
        }).catch(done);
    });
    it('should query the failed migrations', (done) => {
        new mongo_adapter_1.MigrationReports().get({ status: database_1.Status.FAILED }).then(results => {
            expect(results).to.be.an('array');
            expect(results.length).to.be.greaterThan(0);
            done();
        }).catch(done);
    });
    it('should query the deleted migrations', (done) => {
        new mongo_adapter_1.MigrationReports().get({ status: database_1.Status.DELETED }).then(results => {
            expect(results).to.be.an('array');
            expect(results.length).to.be.greaterThan(0);
            done();
        }).catch(done);
    });
    it('should query all non-deleted migrations from a single author', (done) => {
        new mongo_adapter_1.MigrationReports().get({ script_author: 'test dev' }).then(results => {
            expect(results).to.be.an('array');
            expect(results.length).to.be.greaterThan(0);
            done();
        }).catch(done);
    });
    it('should query migrations changed by a single user', (done) => {
        new mongo_adapter_1.MigrationReports().get({ changed_by: 'test user' }).then(results => {
            expect(results).to.be.an('array');
            expect(results.length).to.be.greaterThan(0);
            done();
        }).catch(done);
    });
    it('should query completed migrations created by a single author', (done) => {
        new mongo_adapter_1.MigrationReports().get({ script_author: 'test dev', status: database_1.Status.COMPLETED }).then(results => {
            expect(results).to.be.an('array');
            expect(results.length).to.be.greaterThan(0);
            done();
        }).catch(done);
    });
    it('should query failed migrations created by a single author', (done) => {
        new mongo_adapter_1.MigrationReports().get({ script_author: 'test dev', status: database_1.Status.FAILED }).then(results => {
            expect(results).to.be.an('array');
            expect(results.length).to.be.greaterThan(0);
            done();
        }).catch(done);
    });
});
after(() => {
    console.log('clean up...');
    mongoose.connection.db.dropDatabase().then(() => {
        console.log('...removed test database');
        mongoose.connection.close();
        console.log('...closed connection');
    });
});
