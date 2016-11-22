/// <reference path="../_all.d.ts" />

import * as fs from "fs";

import * as os from "os";

import * as path from "path";

import * as crypto from "crypto";
import * as mkdirp from "mkdirp";

import * as express from "express";
import * as multer from "multer";

module storage {
  export class DiskStorage implements multer.StorageEngine {
    private opts: any;

    private getFilename: any;

    private getDestination: any;

    constructor(opts: any) {
      this.opts = opts;

      this.getFilename = (opts.filename || this._getFilename);

      if (typeof opts.destination === "string") {
        mkdirp.sync(opts.destination);
        this.getDestination = (callback) => { callback(null, opts.destination); };
      } else {
        this.getDestination = (opts.destination || this._getDestination);
      }
    }

    _getFilename(callback: Function): void {
      crypto.pseudoRandomBytes(16, (err, raw) => {
        callback(err, err ? undefined : raw.toString("hex"));
      });
    }

    _getDestination(callback: Function): void {
      callback(null, os.tmpdir());
    }

    _handleFile(req: express.Request, file: any, callback: Function): void {
      var that = this;

      // 取保存路径
      var promise1 = () => {
        return new Promise((resolve, reject) => {
          that.getDestination((err, destination) => {
            err ? reject(err) : resolve(destination);
          });
        });
      };

      // 取文件名
      var promise2 = () => {
        return new Promise((resolve, reject) => {
          that.getFilename((err, filename) => {
            err ? reject(err) : resolve(filename);
          });
        });
      };

      // 保存文件
      var promise3 = (destination, filename) => {
        return new Promise((resolve, reject) => {
          var finalPath: string = path.join(destination, filename);

          var out: fs.WriteStream = fs.createWriteStream(finalPath);

          file.stream.pipe(out);

          out.on("error", (err) => { reject(err); });
          out.on("finish", () => { resolve([ destination, filename, out.bytesWritten ]); });
        });
      };

      // 保存metadata
      var promise4 = (destination, filename, bytesWritten) => {
        return new Promise((resolve, reject) => {
          var metadata = {
            filename: filename,
            originalname: file.originalname,
            encoding: file.encoding,
            mimetype: file.mimetype,
            size: bytesWritten
          };

          var filePath: string = path.join(destination + filename) + ".metadata";
          fs.writeFile(filePath, JSON.stringify(metadata), "utf8", (err) => {
            err ? reject(err) : resolve(metadata);
          });
        });
      };

      Promise.all([
        promise1(),
        promise2()
      ]).then(values => {
        console.dir(values);
        return promise3(values[0], values[1]);
      }).then(values => {
        return promise4(values[0], values[1], values[2]);
      }).then(metadata => {
        callback(null, metadata);
      }).catch(err => {
        callback(err);
      });
    }

    _removeFile(req: express.Request, file: any, callback: (err: NodeJS.ErrnoException) => void): void {
      var that = this;

      // 取保存路径
      var promise1 = () => {
        return new Promise((resolve, reject) => {
          that.getDestination((err, destination) => {
            err ? reject(err) : resolve(destination);
          });
        });
      };

      var promise2 = (destination) => {
        return new Promise((resolve, reject) => {
          var finalPath: string = path.join(destination, file.filename + ".metadata");
          fs.unlink(finalPath, (err) => { err ? reject(err) : resolve(true); });
        });
      };

      var promise3 = (destination) => {
        return new Promise((resolve, reject) => {
          var finalPath: string = path.join(destination, file.filename);
          fs.unlink(finalPath, (err) => { err ? reject(err) : resolve(true); });
        });
      };

      promise1().then((destination) => {
        return Promise.all([ promise2(destination), promise3(destination) ]);
      }).then(() => {
        callback(null);
      }).catch(err => {
        callback(err);
      });
    }
  }

  export function storage(opts: any) {
    return new DiskStorage(opts);
  }

  export function fetch(opts: any) {
    var getDestination;

    if (typeof opts.destination === "string") {
      mkdirp.sync(opts.destination);
      getDestination = (callback) => { callback(null, opts.destination); };
    } else {
      getDestination = (opts.destination || ((callback) => { callback(null, os.tmpdir()); }));
    }

    return (req, res, next) => {
      var filename = req.params[0];
      if (!filename) {
        return next();
      }

      // 取保存路径
      var promise1 = () => {
        return new Promise((resolve, reject) => {
          getDestination((err, destination) => {
            err ? reject(err) : resolve(destination);
          });
        });
      };

      // 查找metadata并下载
      var promise2 = (destination) => {
        return new Promise((resolve, reject) => {
          var filePath: string = path.join(destination, filename + ".metadata");

          fs.readFile(filePath, "utf8", (err, data) => {
            if (err) {
              reject(err);
            } else {
              var metadata = JSON.parse(data);

              var finalPath: string = path.join(destination, filename);
              fs.exists(finalPath, (exists) => {
                if (exists) {
                  res.download(finalPath, metadata.originalname);

                  resolve(metadata);
                } else {
                  reject(err);
                }
              });
            }
          });
        });
      };

      promise1().then(destination => {
        return promise2(destination);
      }).catch(err => {
        next();
      });
    };
  }
}

export = storage;
