import { JSONHelper } from './../../util/json';
import * as chai from 'chai';
const expect = chai.expect;
global['options'] = {
    configFile: 'src/test/test-config.js'
}

describe('json helper tests', () => {
    let jsonString = '{"a": {"b": {"c": "d"}, "z": 99}}'
    let j = new JSONHelper(jsonString)
    it('should parse a json string', (done)=> {
        expect(j.getJSON()).to.be.an('object');
        done()
    })

    it('should clone the json value not reference', (done)=> {
        let clone = j.clone()
        expect(j.getJSON()).to.not.equal(clone)
        expect(j.getJSON().a.b.c).to.equal(clone.a.b.c)
        done()
    })

    it('should find a value by jpath', (done) => {
        let val = j.getJPathValue('a.b.c')
        expect(val).to.equal('d');
        done()
    })

    it('should set a value by jpath', (done) => {
        j.setJPathValue('a.b.c', 'newValue')
        expect(j.getJSON().a.b.c).to.equal('newValue');

        j.setJPathValue('a.b.c', {d: 'e'})
        expect(j.getJSON().a.b.c.d).to.equal('e');

        j.setJPathValue('a.b.c.d', true)
        expect(j.getJSON().a.b.c.d).to.be.true;

        j.setJPathValue('a.b.c.d', null)
        expect(j.getJSON().a.b.c.d).to.be.null;

        j.setJPathValue('a.b.c.d', 10)
        expect(j.getJSON().a.b.c.d).to.equal(10);

        done()
    })

    it('should throw an error when trying to set a value to a function', (done) => {
        let prev = j.getJSON().a.z
        let err = null
        try {
            j.setJPathValue('a.z', ()=> {return ""}) // should throw error
        } catch (e) {
            err = e
        }
        expect(j.getJSON().a.z).to.equal(prev); // val should remain the same as previous and not changed
        expect(err).to.not.be.null;
        done()
    })
})