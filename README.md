Stack - a distributed file storage service
===========================
This is a distributed file storage service, the back-end through a variety of different drivers can be achieved with distributed file storage, front-end with HAProxy achieve high availability.

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Linux Build][travis-image]][travis-url]

Installing
----------
```bash
git clone http://<git-repo-url>/stack
cd stack
npm install
node_modules/.bin/typings install
```

Usage
-----
```bash
npm run grunt serve
```

API
---
"upload"
Accepts a `POST` request of type `multipart/form-data` and saves the data in the `file` field of the request to `local`.

"file"
Accept the `GET` request to get the saved file from `local`.


Supported storage drivers
-------------------------
"disk"
Local disk drive, through this drive with `moosefs`, `GlusterFS`, `ceph` and other distributed file system can support distributed storage.

"ftp"
ftp driver.

"hdfs"
[hdfs driver.](https://hadoop.apache.org/)

"maria"
[maria driver.](https://mariadb.org/)

"memcached"
[memcached driver.](https://memcached.org/)

"mongo"
[mongodb driver.](https://www.mongodb.com/)

"pg"
[postgresql driver.](https://www.postgresql.org/)

"redis"
[redis driver.](http://redis.io/)
