# grid-fs

Convenience wrappers around [MongoDB GridFS](https://github.com/mongodb/node-mongodb-native/blob/master/docs/gridfs.md) methods.

## Installation

    npm install grid-fs --save

## Usage

Require GridFs constructor and create a gridFs instance

```javascript
var GridFs = require('grid-fs');
var gridFs = new GridFs(db[, collectionName]);
```

Where

  * **db** is a opened [database instance](https://github.com/mongodb/node-mongodb-native/blob/master/docs/articles/MongoClient.md)
  * **collectionName** (optional, defaults to `'fs'`) is the collection name for the stored files

**Example**

```javascript
var MongoClient = require('mongodb').MongoClient;
var GridFs = require('grid-fs');
MongoClient.connect('mongodb://127.0.0.1:27017/db', function(err, db) {
    var gridFs = new GridFs(db);
});
```

## List file data

```javascript
gridFs.listFile(filename, callback)
```

Where

  * **filename** is the file to list
  * **callback** is the function to run with arguments (err, info). Info object contains the following properties
    * *filename*
    * *contentType*
    * *uploadDate* – Date object
    * *length* – length in bytes
    * *metadata* – metadata object used when creating the write stream
    * *internalMd5* – MD5 hash of the contents

**Example**

```javascript
gridFs.listFile('test.txt', function(err, info){
    if(err){
        console.log('Error or file not found');
    }else{
        console.log('File uploaded: %s', info.uploadDate);
    }
});
```

## Write files to GridFs

Create Writable stream

```javascript
var stream = gridFs.createWriteStream(filename[, options]);
```

Where

  * **filename** is the file name to use
  * **options** is the optional options object (`metadata` object propery is probably most important)

Listen for the `'close'` event to find out when the file has been stored to the GridFs

**Example**

```javascript
var stream = gridFs.createWriteStream('test.txt', {metadata: {author: 'Andris'}});
stream.end('text.txt');
stream.on('close', function(){
    console.log('File stored and closed');
});
```

## Read files from GridFs

Create Readable stream

```javascript
var stream = gridFs.createReadStream(filename);
```

Where

  * **filename** is the file name to use

**Example**

```javascript
var stream = gridFs.createReadStream('test.txt');
stream.pipe(process.stdout);
```

## Delete files from GridFs

Unlink a file with

```javascript
gridFs.createWriteStream(filename, callback);
```

Where

  * **filename** is the file to unlink
  * **callback** is the function to run once the file is deleted

**Example**

```javascript
gridFs.unlink('test.txt', function(err){
    if(err){
        console.log('Unlink failed');
    }
});
```

## License

**MIT**