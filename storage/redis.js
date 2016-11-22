"use strict";
const stream = require("stream");
const crypto = require("crypto");
let redis = require("redis");
var storage;
(function (storage_1) {
    class RedisStorage {
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
                    var content = Buffer.concat(data).toString("binary");
                    var metadata = {
                        filename: filename,
                        originalname: file.originalname,
                        encoding: file.encoding,
                        mimetype: file.mimetype,
                        size: content.length
                    };
                    var c = redis.createClient(this.opts);
                    c.on("error", (err) => {
                        return callback(err);
                    });
                    c.hmset(filename, ["metadata", JSON.stringify(metadata), "content", content], (err, res) => {
                        c.end(true);
                        callback(err, err ? null : metadata);
                    });
                });
            });
            file.stream.pipe(pt);
        }
        _removeFile(req, file, callback) {
            var c = redis.createClient(this.opts);
            c.on("error", (err) => {
                return callback(err);
            });
            c.del(file.filename, (err) => {
                c.end(true);
                if (err) {
                    return callback(err);
                }
            });
        }
    }
    storage_1.RedisStorage = RedisStorage;
    function storage(opts) {
        return new RedisStorage(opts);
    }
    storage_1.storage = storage;
    function fetch(opts) {
        return (req, res, next) => {
            var filename = req.params[0];
            if (!filename) {
                return next();
            }
            var c = redis.createClient(opts);
            c.on("error", (err) => {
                return next();
            });
            c.hgetall(filename, (err, reply) => {
                c.end(true);
                if (err || !reply) {
                    return next();
                }
                var metadata = JSON.parse(reply.metadata);
                res.setHeader("Content-disposition", "attachment; filename=" + metadata.originalname);
                res.setHeader("Content-type", "application/octet-stream");
                res.send(new Buffer(reply.content, "binary"));
            });
        };
    }
    storage_1.fetch = fetch;
    ;
})(storage || (storage = {}));
module.exports = storage;
