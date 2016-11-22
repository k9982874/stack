"use strict";
const bodyParser = require("body-parser");
const express = require("express");
const path = require("path");
const log4js = require("log4js");
const Route = require("./route");
const storage = require("./storage");
class Server {
    constructor() {
        this.app = express();
        this.config();
        this.routes();
    }
    static bootstrap() {
        return new Server();
    }
    config() {
        log4js.loadAppender("file");
        log4js.addAppender(log4js.appenders.file("debug.log"), "app");
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(express.static(path.join(__dirname, "public")));
        this.app.use(function (err, req, res, next) {
            var logger = log4js.getLogger("err");
            logger.debug(req.ip + ": " + req.method + " - " + req.path);
            var error = new Error("Not Found");
            err.status = 404;
            next(err);
        });
        this.app.use(function (req, res, next) {
            var logger = log4js.getLogger("app");
            logger.debug(req.ip + ": " + req.method + " - " + req.path);
            next();
        });
        this.storage = storage.disk();
    }
    routes() {
        var router;
        router = express.Router();
        var upload = new Route.Upload();
        router.post("/upload", this.storage.upload("file"), upload.index.bind(upload.index));
        var file = new Route.File();
        router.get("/file/*", this.storage.fetch(), file.index.bind(file.index));
        this.app.use(router);
    }
}
var server = Server.bootstrap();
module.exports = server.app;
