/* ----------------------------------------------------------------------
 /	express
 / ---------------------------------------------------------------------- */
var express = require('express');
var cors = require('cors')
var app = express();
app.use(cors({
    "origin": "*",
    "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
    "preflightContinue": false,
    "optionsSuccessStatus": 204
}));


var fs = require('fs');
var sh = require('shelljs');
var tilelive = require('@mapbox/tilelive');
var MBTiles = require('mbtiles');
var path = require('path');
var mbtilespath = '/mbtiles/';
var filepath = __dirname + mbtilespath + 'sourcemap.json';

var MBtileUri = 'mbtiles://';
var zlib = require('zlib');

tilelive.protocols['mbtiles:'] = require('mbtiles');

var tilebelt = require('@mapbox/tilebelt');
var GeoJSON = require('geojson');
var gju = require('geojson-utils');


//neo4j
var neo4j = require('neo4j-driver').v1;

var driver = neo4j.driver("bolt://localhost:7687", neo4j.auth.basic("neo4j", "firstlife2014"));
var session = driver.session();
//fine neo4j

// mongoDB
var url = 'mongodb://localhost:27017/test';
var collection;
var MongoClient = require('mongodb').MongoClient
    , assert = require('assert');

MongoClient.connect(url, {
    poolSize: 30
}, function (err, db) {
    assert.equal(null, err);
    console.log("Connected correctly to MongoDB server");

    myDb = db;

    collection = myDb.collection("areas");

    //db.close();
});// fine mongoDB


/* ----------------------------------------------------------------------
 /  read and return a tile from mbTiles - STEFANIA 
 /  @params
 /  @output mbTiles tile
 / ---------------------------------------------------------------------- */

// Stabilisce quale file mbTile interrogare rispetto al mapping degli zoom sul file mbTilesMap.json
var obj = null;
fs.readFile(filepath, 'utf8', function (err, data) {
    if (err) throw err;
    obj = JSON.parse(data);
});



app.get('/tile/:z/:x/:y', function(req, res) {


    // legge i parametri di z,x,y dalla chiamata GET
    var z = req.params.z;
    var x = req.params.x;
    var y = req.params.y;

    if (!obj) {
        console.error('cannot load source mapping')
        return res.status(404).send('nothing to load');
    }


    var file = obj[z];


    // setta il riferimento uri al file mbTile
    var uri = MBtileUri.concat(__dirname, mbtilespath, file);
    console.log(uri);

    // carica l'mbTile dal riferimento uri
    new MBTiles(uri, function (err, src) {
        try {
            // recupera la tile sulle coordinate z, x, y
            src.getTile(z, x, y, function (err, data) {

                res.setHeader('Access-Control-Allow-Origin', '*');

                console.log(err, data)
                // todo invio tile vuota
                // se non trovo la tile
                if (err) {
                    return res.status(404).send({message: 'Missing tile'});
                }

                // console.log('getTile',z,x,y,data);
                res.setHeader('Content-Type', 'application/x-protobuf');
                res.setHeader('Content-Encoding', 'gzip');
                res.status(200).send(data);
            });

        }
        catch (err) {
            res.status(500).send('db connection error');
        }
    });

});

/* ----------------------------------------------------------------------
 /  read and return an area from mbTiles - STEFANIA 
 /  @params
 /  @output area tile
 / ---------------------------------------------------------------------- */

// Stabilisce quale file mbTile interrogare rispetto al mapping degli zoom sul file mbTilesMap.json
var obj = null;
fs.readFile(filepath, 'utf8', function (err, data) {
    if (err) throw err;
    obj = JSON.parse(data);
});

app.get('/area/:z/:x_lon/:y_lat', function (req, res) {

    // legge i parametri di z,x,y dalla chiamata GET
    var zoom = req.params.z;
    var x_lon = req.params.x_lon;
    var y_lat = req.params.y_lat;

    if (!obj) {
        console.error('cannot load source mapping')
        return res.status(404).send('nothing to load');
    }

    var tile = tilebelt.pointToTile(x_lon, y_lat, zoom);
    var file = obj[zoom];
    console.log(tile)

    var x = tile[0]
    var y = tile[1]
    var z = tile[2]

    console.log('getTile', z, x, y);
    // setta il riferimento uri al file mbTile
    var uri = MBtileUri.concat(__dirname, mbtilespath, file);
    console.log(uri);

    // carica l'mbTile dal riferimento uri
    new MBTiles(uri, function (err, src) {
        try {
            // recupera la tile sulle coordinate z, x, y
            src.getTile(z, x, y, function (err, data) {

                res.setHeader('Access-Control-Allow-Origin', '*');

                console.log(err, data)

                // se non trovo la tile
                if (err) {
                    return res.status(404).send({message: 'Missing tile'});
                }

                var mbtilesfilename = file;
                sh.cd('mbtiles/');
                var cmd = sh.exec('tippecanoe-decode ' + mbtilesfilename + ' ' + z + ' ' + x + ' ' + y, {silent: true});
                var areasInTile = cmd.stdout;

                var code = cmd.code;

                if (code === 0) {

                    var features = JSON.parse(areasInTile).features;
                    var checkFt = [];

                    for (var ft in features) {
                        var geoType = features[ft].geometry.type;
                        var geom = features[ft].geometry;

                        if (geoType.toUpperCase() === "MULTIPOLYGON") {
                            for (var i = 0; i < geom.coordinates.length; i++) {

                                var polygon = {
                                    'type': 'Polygon',
                                    'coordinates': geom.coordinates[i]
                                };

                                var check = gju.pointInPolygon({
                                    "type": "Point",
                                    "coordinates": [x_lon, y_lat]
                                }, polygon)
                                if (check) {
                                    //console.log(ft,"MULTIPOLYGON",features[ft])
                                    checkFt.push(features[ft])
                                }
                            }
                        }

                        if (geoType.toUpperCase() === "POLYGON") {

                            var check = gju.pointInPolygon({"type": "Point", "coordinates": [x_lon, y_lat]}, geom)
                            if (check) {
                                //console.log(ft,"POLYGON",features[ft])
                                checkFt.push(features[ft])
                            }
                        }

                    }

                    // L'ordinamento dei layer è crescente : 
                    // "layer":"nazioni","z_index": 1
                    // "layer":"indoor", "z_index": 14

                    var check_Z = -1;
                    for (p_area in checkFt) {

                        var z_index = checkFt[p_area].properties.z_index;
                        //console.log(check_Z,z_index,checkFt[p_area].properties.id)
                        if (z_index > check_Z) {
                            check_Z = z_index;
                            var area_id = checkFt[p_area].properties.id;
                            //console.log(check_Z,checkFt[p_area].properties.id)
                        }
                    }

                    res.status(200).send(area_id);
                }
                else exit;

                console.log('getting areasInTile with result: ', (code === 0) ? 'ok' : 'error code' + code);
            });

        }
        catch (err) {
            res.status(500).send('db connection error');
        }
    });

});


// gestione aree contenute
app.get('/areas/:id', function (req, res) {

    // legge il parametro :id
    var areaId = req.params.id;

    session
        .run('MATCH (a:Areas {areaId:$id}) return a.areaId as areaId, a.geojson as geojson', {id:areaId})
        .then(function (result) {
            var rst={
            };
            result.records.forEach(function (record) {
                console.log(record.get('areaId'));
                rst=JSON.parse(record.get('geojson'));
            });
            res.status(200).json(rst)
        })
        .catch(function (error) {
            console.log(error);
            res.status(500).json(error);
        });
});

app.get('/',function (req,res) {
    return res.status(200).send('ok');
});

// gestione aree contenute
app.get('/areas/content/:id', function (req, res) {

    // legge il parametro :id
    var areaId = req.params.id;

    session
        .run('MATCH (container:Areas {areaId:$id})<-[r:PART_OF]-(content) return content.areaId as areaId, content.geojson as geojson', {id:areaId})
        .then(function (result) {
            var rst={
                type:"FeatureCollection",
                features:[]
            };
            result.records.forEach(function (record) {
                console.log(record.get('areaId'));
                rst.features.push(JSON.parse(record.get('geojson')))
            });
            res.status(200).json(rst)
        })
        .catch(function (error) {
            console.log(error);
            res.status(500).json(error);
        });
});


// gestione aree contenute
app.get('/areas/contentmongo/:id', function (req, res) {

    // legge il parametro :id
    var areaId = req.params.id;


    collection.find(
        {'_id':areaId}
    ).toArray(function (err, docs) {
        if (docs.length>0) {
            var containerGeometry=docs[0].geometry;
            var containerZIndex=docs[0].properties.z_index;
            var query={
                "properties.z_index": containerZIndex+1,
                "geometry":
                    {
                        "$geoWithin":
                            {
                                "$geometry": containerGeometry
                            }
                    }
            };

            collection.find(query).toArray(function (err, docs) {
                if (!err) {
                    res.status(200).json({
                        type:"FeatureCollection",
                        features:docs
                    });
                }else {
                    res.status(500).json({message:err});
                }
            })
        } else {
            res.status(404).json({message:"Area not "+areaId+" not found"})
        }
    });
});

// init tile server
app.get('/', function (req, res) {
    res.send('Tile server is running');
});
// listner on port
app.listen(3095, function () {
    console.log('Tile server is running on port: 3095');
});


