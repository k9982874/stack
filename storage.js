"use strict";
const multer = require("multer");
const ftpStorage = require("./storage/ftp");
const diskStorage = require("./storage/disk");
const mariaStorage = require("./storage/maria");
const redisStorage = require("./storage/redis");
const postgresStorage = require("./storage/pg");
const memcachedStorage = require("./storage/memcached");
const mongoStorage = require("./storage/mongo");
const HDFSStorage = require("./storage/hdfs");
var storage;
(function (storage) {
    class Instance {
        disk() {
            this._opts = { destination: "uploads/" };
            this._upload = multer({ storage: diskStorage.storage(this._opts) });
            this._fetch = diskStorage.fetch;
            return this;
        }
        ftp() {
            this._opts = {
                host: "127.0.0.1",
                port: "21",
                user: "kevin",
                password: "111111"
            };
            this._upload = multer({ storage: ftpStorage.storage(this._opts) });
            this._fetch = ftpStorage.fetch;
            return this;
        }
        mariadb() {
            this._opts = {
                host: "127.0.0.1",
                user: "root",
                password: "111111",
                db: "test",
                destination: "files"
            };
            this._upload = multer({ storage: mariaStorage.storage(this._opts) });
            this._fetch = mariaStorage.fetch;
            return this;
        }
        redis() {
            this._opts = {
                host: "127.0.0.1",
                port: "6379",
                db: 0
            };
            this._upload = multer({ storage: redisStorage.storage(this._opts) });
            this._fetch = redisStorage.fetch;
            return this;
        }
        postgresql() {
            this._opts = {
                host: "127.0.0.1",
                port: "5432",
                user: "dbuser",
                password: "111111",
                database: "test",
                destination: "files"
            };
            this._upload = multer({ storage: postgresStorage.storage(this._opts) });
            this._fetch = postgresStorage.fetch;
            return this;
        }
        memcached() {
            this._opts = {
                hosts: "127.0.0.1:11211",
                options: {
                    maxKeySize: 250,
                    maxExpiration: 2592000,
                    maxValue: 1048576000,
                    poolSize: 10,
                    reconnect: 18000000,
                    timeout: 5000,
                    retries: 5,
                    failures: 5,
                    retry: 30000,
                    remove: false,
                    failOverServers: undefined,
                    keyCompression: true,
                    idle: 5000,
                }
            };
            this._upload = multer({ storage: memcachedStorage.storage(this._opts) });
            this._fetch = memcachedStorage.fetch;
            return this;
        }
        mongo() {
            this._opts = {
                host: "127.0.0.1",
                port: "27017",
                db: "test",
                collection: "files"
            };
            this._upload = multer({ storage: mongoStorage.storage(this._opts) });
            this._fetch = mongoStorage.fetch;
            return this;
        }
        hdfs() {
            this._opts = {
                user: "root",
                host: "127.0.0.1",
                port: 50070,
                path: "/webhdfs/v1",
                destination: "/files"
            };
            this._upload = multer({ storage: HDFSStorage.storage(this._opts) });
            this._fetch = HDFSStorage.fetch;
            return this;
        }
        upload(key) {
            return this._upload.single(key);
        }
        fetch() {
            return this._fetch(this._opts);
        }
    }
    storage.Instance = Instance;
    function disk() {
        return (new storage.Instance).disk();
    }
    storage.disk = disk;
    function ftp() {
        return (new storage.Instance).ftp();
    }
    storage.ftp = ftp;
    function mariadb() {
        return (new storage.Instance).mariadb();
    }
    storage.mariadb = mariadb;
    function redis() {
        return (new storage.Instance).redis();
    }
    storage.redis = redis;
    function postgresql() {
        return (new storage.Instance).postgresql();
    }
    storage.postgresql = postgresql;
    function memcached() {
        return (new storage.Instance).memcached();
    }
    storage.memcached = memcached;
    function mongo() {
        return (new storage.Instance).mongo();
    }
    storage.mongo = mongo;
    function hdfs() {
        return (new storage.Instance).hdfs();
    }
    storage.hdfs = hdfs;
})(storage || (storage = {}));
module.exports = storage;
