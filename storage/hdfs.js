"use strict";
const path = require("path");
const crypto = require("crypto");
let webhdfs = require("webhdfs");
var storage;
(function (storage_1) {
    class HDFSStorage {
        constructor(opts) {
            this.opts = opts;
            var hdfs = webhdfs.createClient(opts);
            hdfs.exists(opts.destination, (err) => {
                if (typeof err === "object") {
                    throw err;
                }
                if (err === false) {
                    hdfs.mkdir(opts.destination, (err) => {
                        if (err) {
                            throw err;
                        }
                    });
                }
            });
        }
        getFilename(callback) {
            crypto.pseudoRandomBytes(16, (err, raw) => {
                callback(err, err ? undefined : raw.toString("hex"));
            });
        }
        _handleFile(req, file, callback) {
            var that = this;
            var hdfs = webhdfs.createClient(that.opts);
            var promise1 = () => {
                return new Promise((resolve, reject) => {
                    that.getFilename((err, filename) => {
                        err ? reject(err) : resolve(filename);
                    });
                });
            };
            var promise2 = (filename) => {
                return new Promise((resolve, reject) => {
                    var filePath = path.join(that.opts.destination, filename);
                    var out = hdfs.createWriteStream(filePath);
                    out.on("error", (err) => { reject(err); });
                    out.on("finish", () => {
                        hdfs.stat(filePath, (err, stats) => {
                            err ? reject(err) : resolve([filename, stats.length]);
                        });
                    });
                    file.stream.pipe(out);
                });
            };
            var promise3 = (filename, bytesWritten) => {
                return new Promise((resolve, reject) => {
                    var metadata = {
                        filename: filename,
                        originalname: file.originalname,
                        encoding: file.encoding,
                        mimetype: file.mimetype,
                        size: bytesWritten
                    };
                    var filePath = path.join(that.opts.destination, filename) + ".metadata";
                    hdfs.writeFile(filePath, JSON.stringify(metadata), (err) => {
                        err ? reject(err) : resolve(metadata);
                    });
                });
            };
            promise1().then(filename => {
                return promise2(filename);
            }).then(values => {
                return promise3(values[0], values[1]);
            }).then(metadata => {
                callback(null, metadata);
            }).catch(err => {
                callback(err);
            });
        }
        _removeFile(req, file, callback) {
            var that = this;
            var filename = path.join(that.opts.destination, file.filename);
            var hdfs = webhdfs.createClient(that.opts);
            hdfs.unlink(filename, (err) => {
                if (err) {
                    callback(err);
                }
                else {
                    hdfs.unlink(filename + ".metadata", (err) => {
                        callback(null);
                    });
                }
            });
        }
    }
    storage_1.HDFSStorage = HDFSStorage;
    function storage(opts) {
        return new HDFSStorage(opts);
    }
    storage_1.storage = storage;
    function fetch(opts) {
        return (req, res, next) => {
            var filename = req.params[0];
            if (!filename) {
                return next();
            }
            filename = path.join(opts.destination, filename);
            var hdfs = webhdfs.createClient(opts);
            var promise1 = () => {
                return new Promise((resolve, reject) => {
                    hdfs.exists(filename, (err) => {
                        (typeof err === "object") ? reject(err) : (err ? resolve(err) : reject(err));
                    });
                });
            };
            var promise2 = () => {
                return new Promise((resolve, reject) => {
                    hdfs.exists(filename + ".metadata", (err) => {
                        (typeof err === "object") ? reject(err) : (err ? resolve(err) : reject(err));
                    });
                });
            };
            var promise3 = () => {
                return new Promise((resolve, reject) => {
                    hdfs.readFile(filename + ".metadata", (err, data) => {
                        err ? reject(err) : resolve(data);
                    });
                });
            };
            var promise4 = (data) => {
                return new Promise((resolve, reject) => {
                    var metadata = JSON.parse(data);
                    var remote = hdfs.createReadStream(filename);
                    remote.on("error", (err) => { reject(err); });
                    remote.on("finish", () => { resolve(metadata); });
                    res.setHeader("Content-disposition", "attachment; filename=" + metadata.originalname);
                    res.setHeader("Content-type", "application/octet-stream");
                    remote.pipe(res);
                });
            };
            Promise.all([
                promise1(),
                promise2()
            ]).then(values => {
                return promise3();
            }).then(data => {
                return promise4(data);
            }).catch(err => {
                console.dir(err);
                next();
            });
        };
    }
    storage_1.fetch = fetch;
    ;
})(storage || (storage = {}));
module.exports = storage;
