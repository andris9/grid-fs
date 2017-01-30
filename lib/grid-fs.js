'use strict';

const mongodb = require('mongodb');
const stream = require('stream');
const mime = require('mime');
const Readable = stream.Readable;
const Transform = stream.Transform;
const GridStore = mongodb.GridStore;

class WriteStream extends Transform {
    constructor(db, filename, options) {
        super();
        this.resume();
        this._db = db;

        this._gs = new GridStore(this._db, filename, 'w', options);
        this._opened = false;
        this._ended = false;
        this._errored = false;
        this._cache = [];

        this._gs.open(err => {
            if (this._errored) {
                return;
            }
            if (err) {
                this._errored = true;
                if (this._cache.length && this._cache[0] && typeof this._cache[0].done === 'function') {
                    let done = this._cache[0].done;
                    setImmediate(() => done(err));
                } else {
                    this.emit('error', err);
                }
                this._cache = [];
                return;
            }

            let pos = 0;
            let writeNextCached = () => {
                if (pos >= this._cache.length) {
                    this._opened = true;
                    this._cache = [];
                    return;
                }
                let item = this._cache[pos++];
                this._gs.write(item.chunk, err => {

                    if (err) {
                        this._errored = true;
                        setImmediate(() => item.done(err));
                        this._cache = [];
                        return;
                    }
                    setImmediate(() => item.done());
                    writeNextCached();
                });
            };

            setImmediate(writeNextCached);
        });
    }

    _transform(chunk, encoding, done) {
        if (typeof chunk === 'string') {
            chunk = Buffer.from(chunk, encoding);
        }
        if (!this._opened) {
            this._cache.push({
                chunk,
                done
            });
            return;
        }
        this._gs.write(chunk, err => {
            if (err) {
                this._errored = true;
                return done(err);
            }
            return done();
        });
    }

    _flush(done) {
        this._gs.close(() => {
            this.emit('close');
            done();
        });
    }
}

class ReadStream extends Readable {
    constructor(db, filename, options) {
        super();
        this._db = db;
        this._gs = new GridStore(this._db, filename, 'r', options);
        this._opened = false;
        this._errored = false;
        this._cache = [];

        this.expectedSize = false;
        this.bytesRead = 0;

        this._gs.open((err, fileInfo) => {
            if (this._errored) {
                if (!err) {
                    this._gs.close(() => false);
                }
                return;
            }
            if (err) {
                this.emit('error', err);
                this._errored = true;
                return;
            }
            this.expectedSize = fileInfo.length;

            let pos = 0;
            let readNextCached = () => {
                if (pos >= this._cache.length) {
                    this._opened = true;
                    this._cache = [];
                    return;
                }
                let size = this._cache[pos++];

                this.readFromSource(size, (err, chunk) => {
                    if (err) {
                        this._errored = true;
                        this._cache = [];
                        this.emit('error', err);
                        return;
                    }
                    if (chunk && chunk.length) {
                        this.bytesRead += chunk.length;
                        setImmediate(() => this.push(chunk));
                        readNextCached();
                    } else {
                        this._gs.close(err => {
                            this._cache = [];
                            if (err) {
                                this._errored = true;
                                this.emit('error', err);
                                return;
                            }
                            this.push(null);
                        });
                    }
                });
            };
            setImmediate(readNextCached);
        });
    }

    _read(size) {
        if (!this._opened) {
            this._cache.push(size);
            return;
        }
        this.readFromSource(size, (err, chunk) => {
            if (err) {
                this._errored = true;
                this.emit('error', err);
                return;
            }
            if (chunk && chunk.length) {
                this.bytesRead += chunk.length;
                this.push(chunk);
            } else {
                this._gs.close(err => {
                    if (err) {
                        this._errored = true;
                        this.emit('error', err);
                        return;
                    }
                    this.push(null);
                });
            }
        });
    }

    readFromSource(size, done) {
        let sizeAvailable = this.expectedSize - this.bytesRead;
        if (size > sizeAvailable) {
            size = sizeAvailable;
        }
        if (!size) {
            return setImmediate(() => done(null, null));
        }
        this._gs.read(size, done);
    }
}

class GridFs {
    constructor(db, collection) {
        this._db = db;
        this._collection = collection || GridStore.DEFAULT_ROOT_COLLECTION;
    }

    createWriteStream(filename, options) {

        options = options || {};
        options.content_type = options.content_type || mime.lookup(filename);
        options.root = options.root || this._collection;

        return new WriteStream(this._db, filename, options);
    }

    createReadStream(filename, options) {

        options = options || {};
        options.root = options.root || this._collection;

        return new ReadStream(this._db, filename, options);
    }

    unlink(filename, callback) {
        GridStore.unlink(this._db, filename, {
            root: this._collection
        }, callback);
    }

    listFile(filename, callback) {
        let gs = new GridStore(this._db, filename, 'r', {
            root: this._collection
        });
        gs.open((err, fileInfo) => {
            if (err) {
                return callback(err);
            }
            if (!fileInfo) {
                return callback(null, false);
            }
            gs.close(err => {
                if (err) {
                    return callback(err);
                }
                return callback(null, fileInfo);
            });
        });
    }

    list(callback) {
        GridStore.list(this._db, this._collection, callback);
    }
}

module.exports = GridFs;
