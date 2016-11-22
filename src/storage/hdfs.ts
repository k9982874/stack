/// <reference path="../_all.d.ts" />

import * as fs from "fs";

import * as path from "path";

import * as crypto from "crypto";

import * as express from "express";
import * as multer from "multer";

let webhdfs: any = require("webhdfs");

module storage {
  export class HDFSStorage implements multer.StorageEngine {
    private opts: any;

    constructor(opts: any) {
      this.opts = opts;

      var hdfs = webhdfs.createClient(opts);

      // 查看目录是否存在
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

    getFilename(callback: Function): void {
      crypto.pseudoRandomBytes(16, (err, raw) => {
        callback(err, err ? undefined : raw.toString("hex"));
      });
    }

    _handleFile(req: express.Request, file: any, callback: Function): void {
      var that: HDFSStorage = this;

      var hdfs = webhdfs.createClient(that.opts);

      // 获取文件名
      var promise1 = () => {
        return new Promise((resolve, reject) => {
          that.getFilename((err, filename) => {
            err ? reject(err) : resolve(filename);
          });
        });
      };

      // 上传文件
      var promise2 = (filename) => {
        return new Promise((resolve, reject) => {
          var filePath = path.join(that.opts.destination, filename);

          var out = hdfs.createWriteStream(filePath);

          out.on("error",  (err) => { reject(err); });
          out.on("finish", () => {
            hdfs.stat(filePath, (err, stats) => {
              err ? reject(err) : resolve([ filename, stats.length ]);
            });
          });

          file.stream.pipe(out);
        });
      };

      // 上传metadata
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

    _removeFile(req: express.Request, file: any, callback: (err: NodeJS.ErrnoException) => void): void {
      var that: HDFSStorage = this;

      var filename = path.join(that.opts.destination, file.filename);

      var hdfs = webhdfs.createClient(that.opts);

      hdfs.unlink(filename, (err) => {
        if (err) {
          callback(err);
        } else {
          hdfs.unlink(filename + ".metadata", (err) => {
            callback(null);
          });
        }
      });
    }
  }

  export function storage(opts: any) {
    return new HDFSStorage(opts);
  }

  export function fetch(opts: any) {
    return (req, res, next) => {
      var filename = req.params[0];
      if (!filename) {
        return next();
      }

      filename = path.join(opts.destination, filename);

      var hdfs = webhdfs.createClient(opts);

      // 数据文件是否存在
      var promise1 = () => {
        return new Promise((resolve, reject) => {
          hdfs.exists(filename, (err) => {
            (typeof err === "object") ? reject(err) : (err ? resolve(err) : reject(err));
          });
        });
      };

      // metadata文件是否存在
      var promise2 = () => {
        return new Promise((resolve, reject) => {
          hdfs.exists(filename + ".metadata", (err) => {
            (typeof err === "object") ? reject(err) : (err ? resolve(err) : reject(err));
          });
        });
      };

      // 下载metadata文件
      var promise3 = () => {
        return new Promise((resolve, reject) => {
          hdfs.readFile(filename + ".metadata", (err, data) => {
            err ? reject(err) : resolve(data);
          });
        });
      };

      // 下载数据文件
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
  };
}

export = storage;
