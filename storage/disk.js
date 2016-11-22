"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const mkdirp = require("mkdirp");
var storage;
(function (storage_1) {
    class DiskStorage {
        constructor(opts) {
            this.opts = opts;
            this.getFilename = (opts.filename || this._getFilename);
            if (typeof opts.destination === "string") {
                mkdirp.sync(opts.destination);
                this.getDestination = (callback) => { callback(null, opts.destination); };
            }
            else {
                this.getDestination = (opts.destination || this._getDestination);
            }
        }
        _getFilename(callback) {
            crypto.pseudoRandomBytes(16, (err, raw) => {
                callback(err, err ? undefined : raw.toString("hex"));
            });
        }
        _getDestination(callback) {
            callback(null, os.tmpdir());
        }
        _handleFile(req, file, callback) {
            var that = this;
            var promise1 = () => {
                return new Promise((resolve, reject) => {
                    that.getDestination((err, destination) => {
                        err ? reject(err) : resolve(destination);
                    });
                });
            };
            var promise2 = () => {
                return new Promise((resolve, reject) => {
                    that.getFilename((err, filename) => {
                        err ? reject(err) : resolve(filename);
                    });
                });
            };
            var promise3 = (destination, filename) => {
                return new Promise((resolve, reject) => {
                    var finalPath = path.join(destination, filename);
                    var out = fs.createWriteStream(finalPath);
                    file.stream.pipe(out);
                    out.on("error", (err) => { reject(err); });
                    out.on("finish", () => { resolve([destination, filename, out.bytesWritten]); });
                });
            };
            var promise4 = (destination, filename, bytesWritten) => {
                return new Promise((resolve, reject) => {
                    var metadata = {
                        filename: filename,
                        originalname: file.originalname,
                        encoding: file.encoding,
                        mimetype: file.mimetype,
                        size: bytesWritten
                    };
                    var filePath = path.join(destination + filename) + ".metadata";
                    fs.writeFile(filePath, JSON.stringify(metadata), "utf8", (err) => {
                        err ? reject(err) : resolve(metadata);
                    });
                });
            };
            Promise.all([
                promise1(),
                promise2()
            ]).then(values => {
                console.dir(values);
                return promise3(values[0], values[1]);
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
                    that.getDestination((err, destination) => {
                        err ? reject(err) : resolve(destination);
                    });
                });
            };
            var promise2 = (destination) => {
                return new Promise((resolve, reject) => {
                    var finalPath = path.join(destination, file.filename + ".metadata");
                    fs.unlink(finalPath, (err) => { err ? reject(err) : resolve(true); });
                });
            };
            var promise3 = (destination) => {
                return new Promise((resolve, reject) => {
                    var finalPath = path.join(destination, file.filename);
                    fs.unlink(finalPath, (err) => { err ? reject(err) : resolve(true); });
                });
            };
            promise1().then((destination) => {
                return Promise.all([promise2(destination), promise3(destination)]);
            }).then(() => {
                callback(null);
            }).catch(err => {
                callback(err);
            });
        }
    }
    storage_1.DiskStorage = DiskStorage;
    function storage(opts) {
        return new DiskStorage(opts);
    }
    storage_1.storage = storage;
    function fetch(opts) {
        var getDestination;
        if (typeof opts.destination === "string") {
            mkdirp.sync(opts.destination);
            getDestination = (callback) => { callback(null, opts.destination); };
        }
        else {
            getDestination = (opts.destination || ((callback) => { callback(null, os.tmpdir()); }));
        }
        return (req, res, next) => {
            var filename = req.params[0];
            if (!filename) {
                return next();
            }
            var promise1 = () => {
                return new Promise((resolve, reject) => {
                    getDestination((err, destination) => {
                        err ? reject(err) : resolve(destination);
                    });
                });
            };
            var promise2 = (destination) => {
                return new Promise((resolve, reject) => {
                    var filePath = path.join(destination, filename + ".metadata");
                    fs.readFile(filePath, "utf8", (err, data) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            var metadata = JSON.parse(data);
                            var finalPath = path.join(destination, filename);
                            fs.exists(finalPath, (exists) => {
                                if (exists) {
                                    res.download(finalPath, metadata.originalname);
                                    resolve(metadata);
                                }
                                else {
                                    reject(err);
                                }
                            });
                        }
                    });
                });
            };
            promise1().then(destination => {
                return promise2(destination);
            }).catch(err => {
                next();
            });
        };
    }
    storage_1.fetch = fetch;
})(storage || (storage = {}));
module.exports = storage;
