"use strict";
const ftp = require("ftp");
const crypto = require("crypto");
var storage;
(function (storage_1) {
    class FtpStorage {
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
                    var c = new ftp();
                    c.on("ready", () => { resolve(c); });
                    c.on("error", (err) => { reject(err); });
                    c.connect(that.opts);
                });
            };
            var promise3 = (c, filename) => {
                return new Promise((resolve, reject) => {
                    c.put(file.stream, filename, (err) => {
                        if (err) {
                            c.end();
                            reject(err);
                        }
                        else {
                            c.size(filename, (err, numBytes) => {
                                if (err) {
                                    c.end();
                                    reject(err);
                                }
                                else {
                                    resolve([c, filename, numBytes]);
                                }
                            });
                        }
                    });
                });
            };
            var promise4 = (c, filename, numBytes) => {
                return new Promise((resolve, reject) => {
                    var metadata = {
                        filename: filename,
                        originalname: file.originalname,
                        encoding: file.encoding,
                        mimetype: file.mimetype,
                        size: numBytes
                    };
                    var buf = new Buffer(JSON.stringify(metadata));
                    c.put(buf, filename + ".metadata", (err) => {
                        c.end();
                        err ? reject(err) : resolve(metadata);
                    });
                });
            };
            Promise.all([
                promise1(),
                promise2()
            ]).then(values => {
                return promise3(values[1], values[0]);
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
                    var c = new ftp();
                    c.on("ready", () => { resolve(c); });
                    c.on("error", (err) => { reject(err); });
                    c.connect(that.opts);
                });
            };
            var promise2 = (c) => {
                return new Promise((resolve, reject) => {
                    c.delete(file.filename + ".metadata", (err) => {
                        if (err) {
                            c.end();
                            reject(err);
                        }
                        else {
                            resolve(c);
                        }
                    });
                });
            };
            var promise3 = (c) => {
                return new Promise((resolve, reject) => {
                    c.delete(file.filename, (err) => {
                        c.end();
                        err ? reject(err) : resolve(true);
                    });
                });
            };
            promise1().then(c => {
                return promise2(c);
            }).then(c => {
                return promise3(c);
            }).then(() => {
                callback(null);
            }).catch(err => {
                callback(err);
            });
        }
    }
    storage_1.FtpStorage = FtpStorage;
    function storage(opts) {
        return new FtpStorage(opts);
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
                    var c = new ftp();
                    c.on("ready", () => { resolve(c); });
                    c.on("error", (err) => { reject(err); });
                    c.connect(opts);
                });
            };
            var promise2 = (c) => {
                return new Promise((resolve, reject) => {
                    c.get(filename + ".metadata", (err, stream) => {
                        if (err) {
                            c.end();
                            reject(err);
                        }
                        else {
                            var data = "";
                            stream.on("data", (chunk) => { data = data.concat(chunk); });
                            stream.on("end", () => { resolve([c, JSON.parse(data)]); });
                        }
                    });
                });
            };
            var promise3 = (c, metadata) => {
                return new Promise((resolve, reject) => {
                    c.get(filename, (err, stream) => {
                        stream.once("close", () => { c.end(); });
                        if (err) {
                            reject(err);
                        }
                        else {
                            res.setHeader("Content-disposition", "attachment; filename=" + stream.originalname);
                            res.setHeader("Content-type", "application/octet-stream");
                            stream.on("error", (err) => { reject(err); });
                            stream.on("finish", () => { resolve(metadata); });
                            stream.pipe(res);
                        }
                    });
                });
            };
            promise1().then(c => {
                return promise2(c);
            }).then(values => {
                return promise3(values[0], values[1]);
            }).catch(err => {
                next();
            });
        };
    }
    storage_1.fetch = fetch;
})(storage || (storage = {}));
module.exports = storage;
