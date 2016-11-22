/// <reference path="../_all.d.ts" />

import * as fs from "fs";
import * as stream from "stream";

import * as crypto from "crypto";

import * as express from "express";
import * as multer from "multer";

let memcached: any = require("memcached");

module storage {
  export class MemcachedStorage implements multer.StorageEngine {
    private opts: any;

    constructor(opts: any) {
      this.opts = opts;
    }

    getFilename(callback: Function): void {
      crypto.pseudoRandomBytes(16, (err, raw) => {
        callback(err, err ? undefined : raw.toString("hex"));
      });
    }

    _handleFile(req: express.Request, file: any, callback: Function): void {
      var that: MemcachedStorage = this;

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

    _removeFile(req: express.Request, file: any, callback: (err: NodeJS.ErrnoException) => void): void {
      var c = new memcached(this.opts.hosts, this.opts.options);
      c.del(file.filename, (err) => {
          c.end(true);

          if (err) {
            return callback(err);
          }
      });
    }
  }

  export function storage(opts: any) {
    return new MemcachedStorage(opts);
  }

  export function fetch(opts: any) {
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
  };
}

export = storage;
