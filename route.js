"use strict";
var Route;
(function (Route) {
    class Upload {
        index(req, res, next) {
            try {
                var data = {
                    originalname: req.file.originalname,
                    encoding: req.file.encoding,
                    mimetype: req.file.mimetype,
                    filename: req.file.filename,
                    size: req.file.size
                };
                res.send(JSON.stringify(data));
            }
            catch (e) {
                res.status(500).send(e.toString());
            }
        }
    }
    Route.Upload = Upload;
    class File {
        index(req, res, next) {
            res.status(404).send("Not found");
        }
    }
    Route.File = File;
})(Route || (Route = {}));
module.exports = Route;
