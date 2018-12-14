"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    up: (consul, env, done) => {
        // write your migration here. When complete, please pass done to callback parameter
        //  - - - - Examples - - - -
        //
        // add/update a key:
        // consul.set('Test_Key', 'test value', done)
        //
        // set multiple keys:
        // consul.setMany({Test_Key1: 'test value 1', Test_Key2: 'test value 2'}, done)
        //
        // using QueryFactory:
        // consul.key('Test_Key').val('test value').save(done)
        //
        // working with JSON values:
        // consul.key('Test_Key').jpath('a.b.c').val('test value').save(done)
        // 
        // results -----> {"a": {"b": {"c": "test value"}}}
        // 
        // to set keys in depending on environment, use the 'env' value
        // switch(env) {
        //     case 'local':
        //         consul.set('Test_Key', 'local val')
        //         break
        //     case 'production':
        //         consul.set('Test_Key', 'prod val')
        //         break
        //}
    },
    down: (consul, env, done) => {
        // write your rollback here. When complete, please pass done to callback parameter
        //  - - - - Examples - - - -
        //
        // reverse adding a new key:
        // consul.delete('Test_Key', done)
        //
        // rollback multiple keys:
        // consul.deleteMany(['Test_Key1', 'Test_Key2'], done)
        //
        // delete a key with QueryFactory:
        // consul.key('Test_Key').drop(done)
        //
        // delete a single filed in JSON with QueryFactory:
        // consul.key('Test_Key').jpath('a.b.c').drop(done)
        //
        // results ------> {"a": {"b": {}}}
    }
};
