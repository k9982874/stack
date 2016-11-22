"use strict";
const stream = require("stream");
const crypto = require("crypto");
let memcached = require("memcached");
var storage;
(function (storage_1) {
    class MemcachedStorage {
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
            var data = [];
            var pt = new stream.PassThrough();
            pt.on("data", (chunk) => { data.push(chunk); });
            pt.on("error", (err) => { callback(err); });
            pt.on("end", () => {
                that.getFilename((err, filename) => {
                    var content = Buffer.concat(data).toString("hex");
                    var metadata = {
                        filename: filename,
                        originalname: file.originalname,
                        encoding: file.encoding,
                        mimetype: file.mimetype,
                        size: content.length
                    };
                    var c = new memcached(this.opts.hosts, this.opts.options);
                    c.set(filename, { metadata: metadata, content: content }, 0, (err) => {
                        c.end();
                        callback(err, err ? null : metadata);
                    });
                });
            });
            file.stream.pipe(pt);
        }
        _removeFile(req, file, callback) {
            var c = new memcached(this.opts.hosts, this.opts.options);
            c.del(file.filename, (err) => {
                c.end(true);
                if (err) {
                    return callback(err);
                }
            });
        }
    }
    storage_1.MemcachedStorage = MemcachedStorage;
    function storage(opts) {
        return new MemcachedStorage(opts);
    }
    storage_1.storage = storage;
    function fetch(opts) {
        return (req, res, next) => {
            var filename = req.params[0];
            if (!filename) {
                return next();
            }
            var c = new memcached(opts.hosts, opts.options);
            c.get(filename, (err, result) => {
                c.end();
                if (err) {
                    return next();
                }
                res.setHeader("Content-disposition", "attachment; filename=" + result.metadata.originalname);
                res.setHeader("Content-type", "application/octet-stream");
                res.send(new Buffer(result.content, "hex"));
            });
        };
    }
    storage_1.fetch = fetch;
    ;
})(storage || (storage = {}));
module.exports = storage;
