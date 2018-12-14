"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const actions_1 = require("./../../generation/actions");
const chai = require("chai");
const fs = require("fs");
global['options'] = {
    configFile: 'src/test/test-config.js'
};
const expect = chai.expect;
// before((done)=>{
// })
describe('migration generation tests', () => {
    it('should init the migrator and generate a config and migration', (done) => {
        let actions = new actions_1.Actions();
        actions.init().then(result => {
            expect(result).to.be.undefined;
            fs.exists('migrate-consul-config.js', (exists) => {
                expect(exists).to.be.true;
                actions.create('sample').then((result) => {
                    expect(result).to.be.a('string');
                    fs.exists('migrations/' + result, (exists) => {
                        expect(exists).to.be.true;
                        done();
                    });
                }).catch(done);
            });
        }).catch(done);
    });
});
after(() => {
    var deleteFolderRecursive = function (path) {
        if (fs.existsSync(path)) {
            fs.readdirSync(path).forEach(function (file, index) {
                var curPath = path + "/" + file;
                if (fs.lstatSync(curPath).isDirectory()) {
                    deleteFolderRecursive(curPath);
                }
                else {
                    fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(path);
        }
    };
    deleteFolderRecursive('migrations');
    fs.unlinkSync('migrate-consul-config.js');
});
