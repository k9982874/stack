/// <reference path="../_all.d.ts" />

import * as fs from "fs";
import * as stream from "stream";

import * as crypto from "crypto";

import * as express from "express";
import * as multer from "multer";

let redis: any = require("redis");

module storage {
  export class RedisStorage implements multer.StorageEngine {
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
      var that: RedisStorage = this;

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

          c.hmset(filename, [ "metadata", JSON.stringify(metadata), "content", content ], (err, res) => {
            c.end(true);
            callback(err, err ? null : metadata);
          });
        });
      });

      file.stream.pipe(pt);
    }

    _removeFile(req: express.Request, file: any, callback: (err: NodeJS.ErrnoException) => void): void {
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

  export function storage(opts: any) {
    return new RedisStorage(opts);
  }

  export function fetch(opts: any) {
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
  };
}

export = storage;
