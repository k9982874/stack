/// <reference path="_all.d.ts" />

"use strict";

import * as bodyParser from "body-parser";
import * as express from "express";
import * as path from "path";

import * as log4js from "log4js";

import * as multer from "multer";

import * as Route from "./route";

import * as storage from "./storage";

/**
 * The server.
 *
 * @class Server
 */
class Server {
  public app: express.Application;

  public storage: storage.Instance;

  /**
   * Bootstrap the application.
   *
   * @class Server
   * @method bootstrap
   * @static
   * @return {ng.auto.IInjectorService} Returns the newly created injector for this app.
   */
  public static bootstrap(): Server {
    return new Server();
  }

  /**
   * Constructor.
   *
   * @class Server
   * @constructor
   */
  constructor() {
    //create expressjs application
    this.app = express();

    //configure application
    this.config();

    //configure routes
    this.routes();
  }

  /**
   * Configure application
   *
   * @class Server
   * @method config
   * @return void
   */
  private config() {
    log4js.loadAppender("file");
    log4js.addAppender(log4js.appenders.file("debug.log"), "app");

    //configure jade
    //this.app.set("views", path.join(__dirname, "views"));
    //this.app.set("view engine", "jade");

    //mount logger
    //this.app.use(logger("dev"));

    //mount json form parser
    this.app.use(bodyParser.json());

    //mount query string parser
    this.app.use(bodyParser.urlencoded({ extended: true }));

    //add static paths
    this.app.use(express.static(path.join(__dirname, "public")));

    // catch 404 and forward to error handler
    this.app.use(function(err: any, req: express.Request, res: express.Response, next: express.NextFunction) {
      var logger = log4js.getLogger("err");
      logger.debug(req.ip + ": " + req.method + " - " + req.path);

      var error = new Error("Not Found");
      err.status = 404;

      next(err);
    });

    this.app.use(function(req: express.Request, res: express.Response, next: express.NextFunction) {
      var logger = log4js.getLogger("app");
      logger.debug(req.ip + ": " + req.method + " - " + req.path);
      next();
    });

    this.storage = storage.disk();
    //this.storage = storage.ftp();
    //this.storage = storage.mariadb();
    //this.storage = storage.redis();
    //this.storage = storage.postgresql();
    //this.storage = storage.memcached();
    //this.storage = storage.mongo();
    //this.storage = storage.hdfs();
  }

  /**
   * Configure routes
   *
   * @class Server
   * @method routes
   * @return void
   */
  private routes() {
    //get router
    var router: express.Router;

    router = express.Router();

    // upload
    var upload: Route.Upload = new Route.Upload();
    router.post("/upload", this.storage.upload("file"), upload.index.bind(upload.index));

    // download
    var file: Route.File = new Route.File();
    router.get("/file/*", this.storage.fetch(), file.index.bind(file.index));

    //use router middleware
    this.app.use(router);
  }
}

var server = Server.bootstrap();
export = server.app;
