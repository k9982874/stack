/// <reference path="_all.d.ts" />
"use strict";

import * as fs from "fs";

import * as ftp from "ftp";

import * as express from "express";
import * as multer from "multer";

module Route {
  export class Upload {
    public index(req: Express.Request, res: express.Response, next: express.NextFunction) {
      try {
        var data = {
          originalname: req.file.originalname,
          encoding: req.file.encoding,
          mimetype: req.file.mimetype,
          filename: req.file.filename,
          size: req.file.size
        };
        res.send(JSON.stringify(data));
      } catch (e) {
        res.status(500).send(e.toString());
      }
    }
  }

  export class File {
    public index(req: Express.Request, res: express.Response, next: express.NextFunction) {
      res.status(404).send("Not found");
    }
  }
}

export = Route;
