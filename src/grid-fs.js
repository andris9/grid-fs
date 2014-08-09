'use strict';

var mongodb = require('mongodb');
var stream = require('stream');
var Writable = stream.Writable;
var Readable = stream.Readable;
var mime = require('mime');

module.exports = GridFs;

function GridFs(db, collection) {
    this._db = db;
    this._collection = collection || mongodb.GridStore.DEFAULT_ROOT_COLLECTION;
}

GridFs.prototype.createWriteStream = function(filename, options) {

    options = options || {};
    options.content_type = options.content_type || mime.lookup(filename);
    options.root = options.root || this._collection;

    var gs = new mongodb.GridStore(this._db, filename, 'w', options);

    var writable = new Writable();
    var cache = [];

    var _end = writable.end;
    writable.end = function(chunk, encoding, cb) {
        if (typeof cb === 'function') {} else if (typeof encoding === 'function') {
            cb = encoding;
            encoding = undefined;
        } else if (typeof chunk === 'function') {
            cb = chunk;
            chunk = undefined;
        }

        _end.call(writable, chunk, encoding, function() {
            gs.close(function() {
                if (typeof cb === 'function') {
                    cb();
                }
                writable.emit('close');
            });
        });
    };

    var _write = function(chunk, encoding, done) {
        gs.write(chunk, function(err) {
            if (err) {
                done(err);
            } else {
                done();
            }
        });
    };

    // temporary and blocking _write, caches data and returns when gridstore object is opened
    writable._write = function() {
        cache.push(Array.prototype.slice.call(arguments));
    };

    gs.open(function(err) {
        if (err) {
            writable.emit('error', err);
            return;
        }
        writable._write = _write;
        cache.forEach(function(item) {
            _write.apply(null, item);
        });
    });

    return writable;
};

GridFs.prototype.createReadStream = function(filename, options) {
    var gs = new mongodb.GridStore(this._db, filename, 'r', {
        root: this._collection
    });
    var readable = new Readable(options);
    var queuedSize = 0;
    var fileSize = 0;
    var readBytes = 0;

    readable._read = function(size) {
        queuedSize = size;
    };


    var _read = function(size) {
        var sizeAvailable = fileSize - readBytes;
        if (size > sizeAvailable) {
            size = sizeAvailable;
        }
        if (!size) {
            return readable.push(null);
        }
        gs.read(size, function(err, chunk) {
            if (err) {
                readable.emit('error', err);
                return;
            }
            readBytes += chunk && chunk.length || 0;

            if (!chunk || !chunk.length) {
                gs.close(function(err) {
                    if (err) {
                        readable.emit('error', err);
                        return;
                    }
                    readable.push(null);
                });
            } else {
                readable.push(chunk);
            }
        });
    };

    gs.open(function(err, fileInfo) {
        if (err) {
            readable.emit('error', err);
            return;
        }
        fileSize = fileInfo.length;

        readable._read = _read;
        if (queuedSize) {
            _read(queuedSize);
        }
    });

    return readable;
};

GridFs.prototype.unlink = function(filename, callback) {
    mongodb.GridStore.unlink(this._db, filename, {
        root: this._collection
    }, callback);
};

GridFs.prototype.listFile = function(filename, callback) {
    var gs = new mongodb.GridStore(this._db, filename, 'r', {
        root: this._collection
    });
    gs.open(function(err, fileInfo) {
        if (err) {
            return callback(err);
        }
        if (!fileInfo) {
            return callback(null, false);
        }
        gs.close(function(err) {
            if (err) {
                return callback(err);
            }
            return callback(null, fileInfo);
        });
    });
};

GridFs.prototype.list = function(callback) {
    mongodb.GridStore.list(this._db, this._collection, callback);
};