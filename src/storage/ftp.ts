/// <reference path="../_all.d.ts" />

import * as fs from "fs";

import * as ftp from "ftp";

import * as crypto from "crypto";

import * as express from "express";
import * as multer from "multer";

module storage {
  export class FtpStorage implements multer.StorageEngine {
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
      var that = this;

      // 获取文件名
      var promise1 = () => {
        return new Promise((resolve, reject) => {
          that.getFilename((err, filename) => {
            err ? reject(err) : resolve(filename);
          });
        });
      };

      // 连接服务器
      var promise2 = () => {
        return new Promise((resolve, reject) => {
          var c = new ftp();
          c.on("ready", () => { resolve(c); });
          c.on("error", (err) => { reject(err); });

          c.connect(that.opts);
        });
      };

      // 保存文件
      var promise3 = (c, filename) => {
        return new Promise((resolve, reject) => {
          c.put(file.stream, filename, (err) => {
            if (err) {
              c.end();
              reject(err);
            } else {
              c.size(filename, (err, numBytes) => {
                if (err) {
                  c.end();
                  reject(err);
                } else {
                  resolve([ c, filename, numBytes ]);
                }
              });
            }
          });
        });
      };

      // 保存元数据
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

    _removeFile(req: express.Request, file: any, callback: Function): void {
      var that = this;

      // 连接服务器
      var promise1 = () => {
        return new Promise((resolve, reject) => {
          var c = new ftp();
          c.on("ready", () => { resolve(c); });
          c.on("error", (err) => { reject(err); });

          c.connect(that.opts);
        });
      };

      // 删除文件
      var promise2 = (c) => {
        return new Promise((resolve, reject) => {
          c.delete(file.filename + ".metadata", (err) => {
            if (err) {
              c.end();
              reject(err);
            } else {
              resolve(c);
            }
          });
        });
      };

      // 删除元数据文件
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

  export function storage(opts: any) {
    return new FtpStorage(opts);
  }

  export function fetch(opts: any) {
    return (req, res, next) => {
      var filename = req.params[0];
      if (!filename) {
        return next();
      }

      // 连接服务器
      var promise1 = () => {
        return new Promise((resolve, reject) => {
          var c = new ftp();
          c.on("ready", () => { resolve(c); });
          c.on("error", (err) => { reject(err); });

          c.connect(opts);
        });
      };

      // 获取元数据
      var promise2 = (c) => {
        return new Promise((resolve, reject) => {
          c.get(filename + ".metadata", (err, stream) => {
            if (err) {
              c.end();
              reject(err);
            } else {
              var data = "";

              stream.on("data", (chunk) => { data = data.concat(chunk); });
              stream.on("end", () => { resolve([ c, JSON.parse(data) ]); });
            }
          });
        });
      };

      // 获取文件
      var promise3 = (c, metadata) => {
        return new Promise((resolve, reject) => {
          c.get(filename, (err, stream) => {
            stream.once("close", () => { c.end(); });

            if (err) {
              reject(err);
            } else {
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
}

export = storage;
