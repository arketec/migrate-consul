import { Client } from '../../http/client';
import * as chai from 'chai';
const expect = chai.expect;
global['options'] = {
    configFile: 'src/test/test-config.js'
}

const client = new Client({host: 'localhost', port: '8500', secure: false, promisify: true});
describe('simple connection tests',()=> {
    it('should connect and print self', (done)=>{
        client.print();
        done()
    })
})

describe('simple set tests',()=> {
    it('should update a value using promises', (done)=>{
        client.set('mocha_unit_test', 'promise value').then(res => {
            client.get('mocha_unit_test').then(res => {
                expect(res).to.be.an('object')
                expect(res.Value).to.equal('promise value')
                done()
            }).catch(err => {
                done(err)
            })
        }).catch(done)
    })
})

describe('simple key tests',()=> {
    it('should return a value in the callback', (done)=>{
        client.get('mocha_unit_test',(err,res)=> {
            if (err) {
                done(err)
            } else {
                expect(res).to.be.an('object')
                expect(res.Value).to.equal('promise value')
                done()
            }
        })
    })

    it('should return a value in the Promise', (done)=>{
        client.get('mocha_unit_test').then((res) => {
            expect(res).to.be.an('object')
            expect(res.Value).to.equal('promise value')
            done()
        }).catch(done)
    })
})

describe('basic deletion tests', ()=>{
    it('should delete a key', (done)=> {
        client.delete('mocha_unit_test', (err)=> {
            if (err) {
                done(err)
            } else {
                done()
            }
        })
    })
})

describe('multiple key session tests', ()=>{
    it('should create three keys using the same session', (done)=>{
        client.setMany({
            mocha_unit_test_multi_1: 'val 1',
            mocha_unit_test_multi_2: 'val 2',
            mocha_unit_test_multi_3: 'val 3',
        }).then(successes => {
            let successAll = true
            let failed = []
            Object.keys(successes).forEach((k,i)=>{
                if (!successes[k]) {
                    successAll= false
                    failed.push(k)
                }
            })
            if (successAll)
                done()
            else
                done("One or more keys failed to update: " + JSON.stringify(failed))
        }).catch(err => {
            done(err)
        })
    })

    it('should delete multiple keys using the same session', (done)=> {
        client.deleteMany([
            "mocha_unit_test_multi_1",
            "mocha_unit_test_multi_2",
            "mocha_unit_test_multi_3",
        ]).then(() => {
            done()
        }).catch(err => {
            done(err)
        })
    })

    it('should set a json value using jpath', (done) => {
        let key = 'mocha_unit_test_json'
        let n = 'newValue'

        client.key(key).jpath('a.b.c').val(n).save((err, success) => {
            if (err) {
                done(err)
            } else {
                expect(success).to.be.true
                done()
            }
        });
    })

    it('should set a couple json values using jpaths', (done) => {
        let key = 'mocha_unit_test_json'
        let n = 'newMultiValue'

        client.key(key)
            .jpath('a.b.c').val(n)
            .jpath('a.e.f').val(n)
            .save((err, success) => {
                if (err) {
                    done(err)
                } else {
                    expect(success).to.be.true
                    done()
                }
        });
    })
})
