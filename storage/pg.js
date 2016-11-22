"use strict";
const stream = require("stream");
const crypto = require("crypto");
const pg = require("pg");
var storage;
(function (storage_1) {
    class PostgresStorage {
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
                    var c = new pg.Client(this.opts);
                    c.connect((err) => {
                        if (err) {
                            return callback(err);
                        }
                        c.query("insert into " + that.opts.destination + " (filename, metadata, content) values ($1, $2, $3)", [filename, JSON.stringify(metadata), "\\x" + content], (err, result) => {
                            c.end();
                            callback(err, err ? null : metadata);
                        });
                    });
                });
            });
            file.stream.pipe(pt);
        }
        _removeFile(req, file, callback) {
            var c = new pg.Client(this.opts);
            c.connect((err) => {
                if (err) {
                    return callback(err);
                }
                c.query("delete from " + this.opts.destination + " where filename = $1", [file.filename], (err, result) => {
                    c.end();
                    callback(err);
                });
            });
        }
    }
    storage_1.PostgresStorage = PostgresStorage;
    function storage(opts) {
        return new PostgresStorage(opts);
    }
    storage_1.storage = storage;
    function fetch(opts) {
        return (req, res, next) => {
            var filename = req.params[0];
            if (!filename) {
                return next();
            }
            var c = new pg.Client(opts);
            c.connect((err) => {
                if (err) {
                    return next();
                }
                c.query("select metadata, content from " + opts.destination + " where filename = $1", [filename], (err, result) => {
                    c.end();
                    if (err || (result.rowCount < 1)) {
                        return next();
                    }
                    var metadata = JSON.parse(result.rows[0].metadata);
                    res.setHeader("Content-disposition", "attachment; filename=" + metadata.originalname);
                    res.setHeader("Content-type", "application/octet-stream");
                    res.send(new Buffer(result.rows[0].content, "hex"));
                });
            });
        };
    }
    storage_1.fetch = fetch;
    ;
})(storage || (storage = {}));
module.exports = storage;
