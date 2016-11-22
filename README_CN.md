Stack - 分布式文件存储服务
===========================
这是一个分布式文件存储服务，后端通过配合多种不同驱动可以实现分布式文件存储，前端配合HAProxy实现高可用性。

安装
----
```bash
    git clone http://<git-repo-url>/stack
    cd stack
    npm install
    node_modules/.bin/typings install
```

如何使用
--------
```bash
    npm run grunt serve
```

API
---
    "upload"
    接受`multipart/form-data`类型的`POST`请求，保存请求中`file`字段的数据到“本地”。

    "file"
    接受`GET`请求，从“本地”获取保存的文件。


后端支持引擎
------------
    "disk"
    本地磁盘驱动，通过此驱动配合`moosefs`、`GlusterFS`、`ceph`等分布式文件系统可支持分布式存储。

    "ftp"
    ftp服务器驱动。

    "hdfs"
    [hdfs driver。](https://hadoop.apache.org/)

    "maria"
    [maria driver。](https://mariadb.org/)

    "memcached"
    [memcached driver。](https://memcached.org/)

    "mongo"
    [mongodb driver。](https://www.mongodb.com/)

    "pg"
    [postgresql driver。](https://www.postgresql.org/)

    "redis"
    [redis driver。](http://redis.io/)
