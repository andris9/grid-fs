# grid-fs

Convenience wrappers around [MongoDB GridFS](https://github.com/mongodb/node-mongodb-native/blob/master/docs/gridfs.md) methods.

> **v1.0.0+** requires at least Node.js v6

## Installation

    npm install grid-fs --save

## Usage

Require GridFs constructor and create a gridFs instance

```javascript
const GridFs = require('grid-fs');
const gridFs = new GridFs(db[, collectionName]);
```

Where

  * **db** is a opened [database instance](https://github.com/mongodb/node-mongodb-native/blob/master/docs/articles/MongoClient.md)
  * **collectionName** (optional, defaults to `'fs'`) is the collection name for the stored files

**Example**

```javascript
const MongoClient = require('mongodb').MongoClient;
const GridFs = require('grid-fs');
MongoClient.connect('mongodb://127.0.0.1:27017/db', function(err, db) {
    let gridFs = new GridFs(db);
});
```

## List file data

```javascript
gridFs.listFile(filename, callback)
```

Where

  * **filename** is the name of the file to list
  * **callback** is the function to run with arguments (err, info). Info object contains the following properties
    * *filename*
    * *contentType*
    * *uploadDate* – Date object
    * *length* – length in bytes
    * *metadata* – metadata object used when creating the write stream
    * *internalMd5* – MD5 hash of the contents

**Example**

```javascript
gridFs.listFile('test.txt', (err, info) => {
    if(err){
        console.log('Error or file not found');
    }else{
        console.log('File uploaded: %s', info.uploadDate);
    }
});
```

## List all files

List all files in the collection

```javascript
gridFs.list(callback)
```

Where

  * **callback** is the function to run when file list is fetched, uses arguments (err, list) where list is an array of file names

**Example**

```javascript
gridFs.list((err, list) => {
    if(err){
        console.log(err);
    }else{
        list.forEach(filename => {
            console.log(filename);
        });
    }
});
```

## Write files to GridFs

Create Writable stream

```javascript
let stream = gridFs.createWriteStream(filename[, options]);
```

Where

  * **filename** is the name of file to write to (overwrites existing file if present)
  * **options** is the optional options object (`metadata` object property is probably most important)

Listen for the `'close'` event to find out when the file has been stored to the GridFs

**Example**

```javascript
let stream = gridFs.createWriteStream('test.txt', {
    metadata: {
        author: 'Andris'
    }
});
stream.end('text.txt');
stream.on('close', () => {
    console.log('File stored and closed');
});
```

## Read files from GridFs

Create Readable stream

```javascript
let stream = gridFs.createReadStream(filename);
```

Where

  * **filename** is the name of the file to read from

**Example**

```javascript
let stream = gridFs.createReadStream('test.txt');
stream.pipe(process.stdout);
```

## Delete files from GridFs

Unlink a file with

```javascript
gridFs.unlink(filename, callback);
```

Where

  * **filename** is the name of the file to unlink
  * **callback** is the function to run once the file is deleted

**Example**

```javascript
gridFs.unlink('test.txt', err => {
    if(err){
        console.log('Unlink failed');
    }
});
```

## License

**MIT**
