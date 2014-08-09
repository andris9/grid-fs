'use strict';

var chai = require('chai');
var GridFs = require('../src/grid-fs');
var expect = chai.expect;
var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var fs = require('fs');
var crypto = require('crypto');

chai.Assertion.includeStack = true;

var FILENAME = 'alice_in_wonderland.txt';
var COLLECTION = 'test';

describe('GridFs tests', function() {
    var db, gs;

    beforeEach(function(done) {
        MongoClient.connect('mongodb://127.0.0.1:27017/gridtest', function(err, database) {
            if (err) {
                return done(err);
            }

            db = database;
            gs = new GridFs(db, COLLECTION);
            done();
        });
    });

    afterEach(function(done) {
        db.close(done);
    });

    it('Should stream file to gfs', function(done) {
        var input = fs.createReadStream(__dirname + '/fixtures/alice.txt');
        var output = gs.createWriteStream(FILENAME, {
            metadata: {
                author: 'Andris'
            }
        });

        output.on('error', function(err) {
            done(err);
        });

        output.on('close', function() {
            done();
        });

        input.pipe(output);
    });

    it('Should stream file from gfs', function(done) {
        var input = gs.createReadStream(FILENAME);
        var hash = crypto.createHash('md5');

        input.on('data', function(chunk) {
            hash.update(chunk);
        });

        input.on('end', function() {
            expect(hash.digest('hex')).to.equal('7c61ed1f8c22571478375ae5c21ca4ff');
            done();
        });

        input.on('error', function(err) {
            done(err);
        });
    });

    it('Should not list file from gfs', function(done) {
        gs.listFile('alice.txtssssssssss', function(err) {
            expect(err).to.exist;
            done();
        });
    });

    it('Should list file from gfs', function(done) {
        gs.listFile(FILENAME, function(err, info) {
            expect(err).to.not.exist;
            expect(info.filename).to.equal(FILENAME);
            expect(info.internalMd5).to.equal('7c61ed1f8c22571478375ae5c21ca4ff');
            done();
        });
    });

    it('Should list files from gfs', function(done) {
        gs.list(function(err, list) {
            expect(err).to.not.exist;
            expect(list.indexOf(FILENAME)).to.be.gte(0);
            done();
        });
    });

    it('Should unlink file from gfs', function(done) {
        gs.unlink(FILENAME, function(err) {
            expect(err).to.not.exist;
            gs.listFile(FILENAME, function(err) {
                expect(err).to.exist;
                done();
            });
        });
    });
});