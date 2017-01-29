/* eslint no-unused-expressions:0, prefer-arrow-callback: 0 */
/* globals beforeEach, describe, it */

'use strict';

const chai = require('chai');
const GridFs = require('../lib/grid-fs');
const expect = chai.expect;
const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;
const fs = require('fs');
const crypto = require('crypto');
const FILENAME = 'alice_in_wonderland.txt';
const COLLECTION = 'test';

chai.config.includeStack = true;

describe('GridFs tests', function () {
    let db, gs;

    beforeEach(function (done) {
        MongoClient.connect('mongodb://127.0.0.1:27017/gridtest', function (err, database) {
            if (err) {
                return done(err);
            }

            db = database;
            gs = new GridFs(db, COLLECTION);
            done();
        });
    });

    afterEach(function (done) {
        db.close(done);
    });

    it('Should stream file to gfs', function (done) {
        let input = fs.createReadStream(__dirname + '/fixtures/alice.txt');
        let output = gs.createWriteStream(FILENAME, {
            metadata: {
                author: 'Andris'
            }
        });

        output.on('error', function (err) {
            done(err);
        });

        output.on('close', function () {
            done();
        });

        input.pipe(output);
    });

    it('Should stream file from gfs', function (done) {
        let input = gs.createReadStream(FILENAME);
        let hash = crypto.createHash('md5');

        input.on('data', function (chunk) {
            hash.update(chunk);
        });

        input.on('end', function () {
            expect(hash.digest('hex')).to.equal('7c61ed1f8c22571478375ae5c21ca4ff');
            done();
        });

        input.on('error', function (err) {
            done(err);
        });
    });

    it('Should not list file from gfs', function (done) {
        gs.listFile('alice.txtssssssssss', function (err) {
            expect(err).to.exist;
            done();
        });
    });

    it('Should list file from gfs', function (done) {
        gs.listFile(FILENAME, function (err, info) {
            expect(err).to.not.exist;
            expect(info.filename).to.equal(FILENAME);
            expect(info.internalMd5).to.equal('7c61ed1f8c22571478375ae5c21ca4ff');
            done();
        });
    });

    it('Should list files from gfs', function (done) {
        gs.list(function (err, list) {
            expect(err).to.not.exist;
            expect(list.includes(FILENAME)).to.be.true;
            done();
        });
    });

    it('Should unlink file from gfs', function (done) {
        gs.unlink(FILENAME, function (err) {
            expect(err).to.not.exist;
            gs.listFile(FILENAME, function (err) {
                expect(err).to.exist;
                done();
            });
        });
    });
});
