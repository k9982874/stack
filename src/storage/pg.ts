/// <reference path="../_all.d.ts" />

import * as fs from "fs";
import * as stream from "stream";

import * as crypto from "crypto";

import * as express from "express";
import * as multer from "multer";

import * as pg from "pg";

/**
CREATE TABLE files (
  filename varchar(64) NOT NULL,
  metadata text,
  content bytea,
  PRIMARY KEY (filename)
);
**/
module storage {
  export class PostgresStorage implements multer.StorageEngine {
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
      var that: PostgresStorage = this;

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

            c.query(
              "insert into " + that.opts.destination + " (filename, metadata, content) values ($1, $2, $3)",
              [filename, JSON.stringify(metadata), "\\x" + content],
              (err, result) => {
                c.end();
                callback(err, err ? null : metadata);
              });
          });
        });
      });

      file.stream.pipe(pt);
    }

    _removeFile(req: express.Request, file: any, callback: (err: NodeJS.ErrnoException) => void): void {
      var c = new pg.Client(this.opts);
      c.connect((err) => {
        if (err) {
          return callback(err);
        }

        c.query("delete from " + this.opts.destination + " where filename = $1", [file.filename],
          (err, result) => {
            c.end();

            callback(err);
          });
      });
    }
  }

  export function storage(opts: any) {
    return new PostgresStorage(opts);
  }

  export function fetch(opts: any) {
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

        c.query("select metadata, content from " + opts.destination + " where filename = $1", [ filename ],
          (err, result) => {
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
  };
}

export = storage;
