import { Actions } from './../../generation/actions';
import * as chai from 'chai'
import * as fs from 'fs'
import { nowAsString } from '../../util/date'
global['options'] = {
    configFile: 'src/test/test-config.js'
}

const expect = chai.expect;

// before((done)=>{
    
// })

describe('migration generation tests', () => {
    it('should init the migrator and generate a config and migration', (done)=> {
        let actions = new Actions()
        actions.init().then(result => {
            expect(result).to.be.undefined
            fs.exists('migrate-consul-config.js', (exists) => {
                expect(exists).to.be.true
                actions.create('sample').then((result: string) => {
                    expect(result).to.be.a('string')
                    fs.exists('migrations/' + result, (exists) => {
                        expect(exists).to.be.true
                        done()
                    })
                }).catch(done)
            })
        }).catch(done)
    })
})



after(() => {
    var deleteFolderRecursive = function(path) {
        if (fs.existsSync(path)) {
            fs.readdirSync(path).forEach(function(file, index){
            var curPath = path + "/" + file;
                if (fs.lstatSync(curPath).isDirectory()) {
                    deleteFolderRecursive(curPath);
                } else {
                    fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(path);
        }
    };
    deleteFolderRecursive('migrations')
    fs.unlinkSync('migrate-consul-config.js')
});