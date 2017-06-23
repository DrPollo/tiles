# FirstLife Tileserver

V1.0 of FirstLife tile server

## How to install
To install tileserver run:

```
npm install
```

## How to test

gulp build
```
To test tileserver run:

```
node server.js
```

Query examples
```
Get Tile from point : z/x/y

http://localhost:3090/tile/10/533/368
http://localhost:3090/tile/5/16/11
http://localhost:3090/tile/12/2135/1472

Get Area from point : z/lon/lat

http://localhost:3090/area/12/7.692607641220094/45.08807547183474
