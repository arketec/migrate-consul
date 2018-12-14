"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const consul = require("consul");
const session_1 = require("../../http/session");
const chai = require("chai");
const expect = chai.expect;
global['options'] = {
    configFile: 'src/test/test-config.js'
};
const client = new consul({ host: 'localhost', port: '8500', promisify: true });
describe('session tests', () => {
    let session = new session_1.Session(client);
    it('should create a session', (done) => {
        session.create().then(sessionId => {
            expect(sessionId).to.be.a('string');
            expect(session.active()).to.be.true;
            expect(session.getSessionId()).to.equal(sessionId);
            done();
        }).catch(err => done(err));
    });
    it('should destroy a session', (done) => {
        session.destroy().then(() => {
            expect(session.active()).to.be.false;
            expect(session.getSessionId()).to.be.null;
            done();
        }).catch(err => done(err));
    });
});
