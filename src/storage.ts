/// <reference path="_all.d.ts" />

import * as multer from "multer";

import * as ftpStorage from "./storage/ftp";
import * as diskStorage from "./storage/disk";
import * as mariaStorage from "./storage/maria";
import * as redisStorage from "./storage/redis";
import * as postgresStorage from "./storage/pg";
import * as memcachedStorage from "./storage/memcached";
import * as mongoStorage from "./storage/mongo";
import * as HDFSStorage from "./storage/hdfs";

module storage {
  export class Instance {
    private _opts: any;
    private _upload: any;
    private _fetch: any;

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
        //password: "111111",
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
          maxValue: 1048576000, // default 1048576
          poolSize: 10,
          //algorithm: md5,
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

    upload(key: string) {
      return this._upload.single(key);
    }

    fetch() {
      return this._fetch(this._opts);
    }
  }

  export function disk() {
    return (new storage.Instance).disk();
  }

  export function ftp() {
    return (new storage.Instance).ftp();
  }

  export function mariadb() {
    return (new storage.Instance).mariadb();
  }

  export function redis() {
    return (new storage.Instance).redis();
  }

  export function postgresql() {
    return (new storage.Instance).postgresql();
  }

  export function memcached() {
    return (new storage.Instance).memcached();
  }

  export function mongo() {
    return (new storage.Instance).mongo();
  }

  export function hdfs() {
    return (new storage.Instance).hdfs();
  }
}

export = storage;
