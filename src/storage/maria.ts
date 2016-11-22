/// <reference path="../_all.d.ts" />

import * as fs from "fs";
import * as stream from "stream";

import * as crypto from "crypto";

import * as express from "express";
import * as multer from "multer";

let mariasql: any = require("mariasql");

/**
CREATE TABLE `files` (
  `filename` varchar(64) NOT NULL,
  `metadata` text,
  `content` longtext,
  PRIMARY KEY (`filename`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
**/
module storage {
  export class MariaStorage implements multer.StorageEngine {
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
      var that: MariaStorage = this;

      // 获取文件名
      var promise1 = () => {
        return new Promise((resolve, reject) => {
          that.getFilename((err, filename) => {
            err ? reject(err) : resolve(filename);
          });
        });
      };

      // 保存数据
      var promise2 = () => {
        return new Promise((resolve, reject) => {
          var data = [];

          var pt = new stream.PassThrough();
          pt.on("data", (chunk) => { data.push(chunk); });
          pt.on("error", (err) => { reject(err); });
          pt.on("end", () => { resolve(data); });

          file.stream.pipe(pt);
        });
      };

      // 上传文件
      var promise3 = (filename, data) => {
        return new Promise((resolve, reject) => {
            var content = Buffer.concat(data).toString("binary");

            var metadata = {
              filename: filename,
              originalname: file.originalname,
              encoding: file.encoding,
              mimetype: file.mimetype,
              size: content.length
            };

            var c = new mariasql(that.opts);

            c.query(
              "insert into `" + that.opts.destination + "` (`filename`, `metadata`, `content`) values " +
              "(:filename, :metadata, :content)",
              { filename: filename, metadata: JSON.stringify(metadata), content: content },
              (err, result) => {
                err ? reject(err) : resolve(metadata);
              }
            );

            c.end();
        });
      };

      Promise.all([
        promise1(),
        promise2()
      ]).then(values => {
        return promise3(values[0], values[1]);
      }).then(metadata => {
        callback(null, metadata);
      }).catch(err => {
        callback(err);
      });
    }

    _removeFile(req: express.Request, file: any, callback: (err: NodeJS.ErrnoException) => void): void {
      var c = new mariasql(this.opts);

      c.query("delete from " + this.opts.destination + " where filename = ?", [file.filename],
        (err, rows) => {
          callback(err);
        });

      c.end();
    }
  }

  export function storage(opts: any) {
    return new MariaStorage(opts);
  }

  export function fetch(opts: any) {
    return (req, res, next) => {
      var filename = req.params[0];
      if (!filename) {
        return next();
      }

      var c = new mariasql(opts);

      c.query("select `metadata`, `content` from `" + opts.destination + "` where `filename` = ?", [filename],
        (err, rows) => {
          if (err || (rows.info.numRows < 1)) {
            return next();
          }

          var metadata = JSON.parse(rows[0].metadata);

          res.setHeader("Content-disposition", "attachment; filename=" + metadata.originalname);
          res.setHeader("Content-type", "application/octet-stream");

          res.send(new Buffer(rows[0].content, "binary"));
        });
      c.end();
    };
  };
}

export = storage;
