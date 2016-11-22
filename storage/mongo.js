"use strict";
const crypto = require("crypto");
let mongodb = require("mongodb");
var storage;
(function (storage_1) {
    class MongoStorage {
        constructor(opts) {
            this.opts = opts;
        }
        getFilename(callback) {
            crypto.pseudoRandomBytes(16, (err, raw) => {
                callback(err, err ? undefined : raw.toString("hex"));
            });
        }
        _handleFile(req, file, callback) {
            var that = this;
            var promise1 = () => {
                return new Promise((resolve, reject) => {
                    that.getFilename((err, filename) => {
                        err ? reject(err) : resolve(filename);
                    });
                });
            };
            var promise2 = () => {
                return new Promise((resolve, reject) => {
                    var uri = "mongodb://" + that.opts.host + ":" + that.opts.port + "/" + that.opts.db;
                    mongodb.MongoClient.connect(uri, (err, db) => {
                        err ? reject(err) : resolve(db);
                    });
                });
            };
            var promise3 = (db, filename, stream) => {
                return new Promise((resolve, reject) => {
                    var bucket = new mongodb.GridFSBucket(db);
                    var bstream = bucket.openUploadStreamWithId(filename, filename);
                    stream.pipe(bstream)
                        .on("error", (err) => {
                        db.close();
                        reject(err);
                    })
                        .on("finish", () => {
                        resolve([db, filename, bstream.length]);
                    });
                });
            };
            var promise4 = (db, filename, bytesWritten) => {
                return new Promise((resolve, reject) => {
                    var metadata = {
                        "filename": filename,
                        "originalname": file.originalname,
                        "encoding": file.encoding,
                        "mimetype": file.mimetype,
                        "size": bytesWritten
                    };
                    var col = db.collection(that.opts.collection);
                    col.insertOne(metadata, (err, r) => {
                        db.close();
                        err ? reject(err) : resolve(metadata);
                    });
                });
            };
            Promise.all([
                promise1(),
                promise2()
            ]).then(values => {
                return promise3(values[1], values[0], file.stream);
            }).then(values => {
                return promise4(values[0], values[1], values[2]);
            }).then(metadata => {
                callback(null, metadata);
            }).catch(err => {
                callback(err);
            });
        }
        _removeFile(req, file, callback) {
            var that = this;
            var promise1 = () => {
                return new Promise((resolve, reject) => {
                    var uri = "mongodb://" + that.opts.host + ":" + that.opts.port + "/" + that.opts.db;
                    mongodb.MongoClient.connect(uri, (err, db) => {
                        err ? reject(err) : resolve(db);
                    });
                });
            };
            var promise2 = (db) => {
                return new Promise((resolve, reject) => {
                    var col = db.collection(that.opts.collection);
                    col.deleteOne({ filename: file.filename }, (err, r) => {
                        if (err) {
                            db.close();
                            reject(err);
                        }
                        else {
                            resolve(db);
                        }
                    });
                });
            };
            var promise3 = (db) => {
                return new Promise((resolve, reject) => {
                    var bucket = new mongodb.GridFSBucket(db);
                    bucket.delete(file.filename, err => {
                        db.close();
                        err ? reject(err) : resolve(true);
                    });
                });
            };
            promise1().then(db => {
                return promise2(db);
            }).then(db => {
                return promise3(db);
            }).then(() => {
                callback(null);
            }).catch(err => {
                callback(err);
            });
        }
    }
    storage_1.MongoStorage = MongoStorage;
    function storage(opts) {
        return new MongoStorage(opts);
    }
    storage_1.storage = storage;
    function fetch(opts) {
        return (req, res, next) => {
            var filename = req.params[0];
            if (!filename) {
                return next();
            }
            var promise1 = () => {
                return new Promise((resolve, reject) => {
                    var uri = "mongodb://" + opts.host + ":" + opts.port + "/" + opts.db;
                    mongodb.MongoClient.connect(uri, (err, db) => {
                        err ? reject(err) : resolve(db);
                    });
                });
            };
            var promise2 = (db) => {
                return new Promise((resolve, reject) => {
                    var col = db.collection(opts.collection);
                    col.find({ filename: filename }).toArray((err, docs) => {
                        if (err) {
                            db.close();
                            reject(err);
                        }
                        else {
                            resolve([db, docs]);
                        }
                    });
                });
            };
            var promise3 = (db, docs) => {
                return new Promise((resolve, reject) => {
                    var bucket = new mongodb.GridFSBucket(db);
                    var stream = bucket.openDownloadStreamByName(docs[0].filename);
                    stream.on("error", (err) => { db.close(); reject(err); });
                    stream.on("finish", () => { db.close(); resolve(docs[0]); });
                    res.setHeader("Content-disposition", "attachment; filename=" + docs[0].originalname);
                    res.setHeader("Content-type", "application/octet-stream");
                    stream.pipe(res);
                });
            };
            promise1().then(db => {
                return promise2(db);
            }).then(values => {
                return promise3(values[0], values[1]);
            }).catch(err => {
                return next();
            });
        };
    }
    storage_1.fetch = fetch;
    ;
})(storage || (storage = {}));
module.exports = storage;
