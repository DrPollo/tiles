/* ----------------------------------------------------------------------
 /	express
 / ---------------------------------------------------------------------- */
const express = require('express');
const cors = require('cors');
const request = require('request');
const zlib = require('zlib');

const app = express();

app.use(cors({
    "origin": "*",
    "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
    "preflightContinue": false,
    "optionsSuccessStatus": 204
}));

const fs = require('fs');
const sh = require('shelljs');
const tilelive = require('@mapbox/tilelive');
const MBTiles = require('mbtiles');
const path = require('path');
const mbtilespath = '/mbtiles/';
const filepath = __dirname + mbtilespath + 'tiles_map.json';

const MBtileUri = 'mbtiles://';

tilelive.protocols['mbtiles:'] = require('mbtiles');

const tilebelt = require('@mapbox/tilebelt');
var GeoJSON = require('geojson');
var gju = require('geojson-utils');
var bboxPolygon = require('@turf/bbox-polygon')
var turf = require('turf');
const geojsonvt = require ('geojson-vt');
const vtpbf = require('vt-pbf');
var VectorTile = require('@mapbox/vector-tile').VectorTile;
var Protobuf = require('pbf');
var merge = require('merge');

// certificates
const uwum_key = fs.readFileSync('./certificates/wegovnow.firstlife.org.cert.key.pem');
const uwum_cert = fs.readFileSync('./certificates/wegovnow.firstlife.org.cert.key.pem');


// logger url
const otmUrl = "https://api.ontomap.eu/api/v1/";


// porta
var defaultPort = 3095;



//neo4j
var neo4j = require('neo4j-driver').v1;

var driver = neo4j.driver("bolt://localhost:7687", neo4j.auth.basic("neo4j", "firstlife2014"));
var session = driver.session();
//fine neo4j

// mongoDB
var mongoDB = 'fl_v2';
var mongoCollection = 'area';
var url = 'mongodb://localhost:27017/'+mongoDB;
var collection;
var MongoClient = require('mongodb').MongoClient
    , assert = require('assert');

MongoClient.connect(url, {
    poolSize: 30
}, function (err, db) {
    assert.equal(null, err);
    console.log("Connected correctly to MongoDB server");

    myDb = db;

    collection = myDb.collection(mongoCollection);

    //db.close();
});// fine mongoDB


/*
* @desc Combine two Vector Tile from fl and otm source and return a pbf
* @param req -> x,y,z {string} tile notation
* @output pbf
*/

app.get('/tileExtended/:z/:x/:y', function(req, res) {

    res.setHeader('Access-Control-Allow-Origin', '*');

    Promise.all([fl_tile(req,res),otm_tile(req,res)]).then(
        value => { 

            //console.log('value[0] ',value[0]);
            //console.log('value[1] ',value[1]);

            /* vectorTile
             * {
                x, y, z,
                layers:{
                    ...layer1. layern...
                    layerName:[features]
                }
                size, 
             }
            */

            // combino i layer delle due vector tile
            var tmp = merge.recursive(value[0],value[1]);
            //stampa e controlla
            //console.log('tmp ',tmp);


            // encode della nuova vector tile in pbf
            var newBuf = vtpbf(tmp);

            res.setHeader('Content-Type', 'application/x-protobuf');
            res.send(200).send(newBuf);

            // comprimo il pbf contenente il vector tile
            // zlib.gzip(newBuf, function(err, result) {

            //     if(result) {
            //         res.setHeader('Content-Type', 'application/x-protobuf');
            //         res.setHeader('Content-Encoding', 'gzip');
            //         res.send(200).send(result); 
            //     }

            //     else res.status(404).send({message: 'No zip pbf'});
            // });

        }).catch(error => { });
});

/*
* @desc Read and return a mbTiles
* @param req -> x,y,z {string} tile notation
* @output zipped pbf
*/

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


    // console.log('fl_tile ',x,y,z);

    if (!obj) {
        console.error('cannot load source mapping');
        return res.status(404).send('nothing to load');
    }

    //Stabilisce quale mbtile richiamare dal file di mapping rispetto al livello di zoom
    // default : Global (nel caso in cui z > tile_maxzoom si otterrà comunque "Missing Tile")
    var file_list = obj[z];
    // console.log(file_list);
    var file = 'Global.mbtiles';

    // controlla se le cordinate x:y rientrano nella bbox del file mbtile
    for(let t in file_list){
        
        var poly = bboxPolygon(file_list[t][1]);

        var pt = turf.point([x, y]);

        var check = turf.inside(pt,poly);

        if (check === true) {
            file = t;
            break;
        }
    }
    // console.log(file);

    res.setHeader('Access-Control-Allow-Origin', '*');

    // setta il riferimento uri al file mbTile
    var uri = MBtileUri.concat(__dirname, mbtilespath, file);
     console.log(uri,z);

    // carica l'mbTile dal riferimento uri
    new MBTiles(uri, function (err, src) {
        try {
            // recupera la tile sulle coordinate z, x, y
            src.getTile(z, x, y, function (err, data) {

                // se non trovo la tile
                if (err) {
                    return res.status(404).send({message: 'Missing tile'});
                }

                // console.log('FL getTile ',z,x,y);

                //console.log('FL getTile ',data)
                res.setHeader('Content-Type', 'application/x-protobuf');
                res.setHeader('Content-Encoding', 'gzip');
                res.status(200).send(data);
            });

        }
        catch (err) {
            res.status(500).send({message:'db connection error'});
        }
    });
});

/*
* @desc Read and return a vector tile from mbTiles
* @param req -> x,y,z {string} tile notation, res object
* @output Vector Tile
*/

var fl_tile = function(req,res) {
  return new Promise(function(resolve, reject) {

    // legge i parametri di z,x,y dalla chiamata GET
    var z = req.params.z;
    var x = req.params.x;
    var y = req.params.y;


    console.log('fl_tile ',x,y,z)

    if (!obj) {
        console.error('cannot load source mapping')
        return reject(res.status(404).send('nothing to load'));
    }

    //Stabilisce quale mbtile richiamare dal file di mapping rispetto al livello di zoom
    // default : Global (nel caso in cui z > tile_maxzoom si otterrà comunque "Missing Tile")
    var file_list = obj[z];
    console.log(file_list)
    var file = 'Global.mbtiles'

    // controlla se le cordinate x:y rientrano nella bbox del file mbtile
    for(t in file_list){
        
        var poly = bboxPolygon(file_list[t][1]);

        var pt = turf.point([x, y]);

        var check = turf.inside(pt,poly)

        if (check == true) {
            file = t
            break;
        }
    }
    console.log(file)


    // setta il riferimento uri al file mbTile
    var uri = MBtileUri.concat(__dirname, mbtilespath, file);
    console.log(uri);

    // carica l'mbTile dal riferimento uri
    new MBTiles(uri, function (err, src) {
        try {
            // recupera la tile sulle coordinate z, x, y
            src.getTile(z, x, y, function (err, data) {

                // se non trovo la tile
                if (err) {
                    return reject(res.status(404).send({message: 'Missing tile FL'}));
                }

                //console.log('FL getTile ',z,x,y);

                // decomprimo il pbf contenente la tile
                zlib.gunzip(data, function(err, buffer) {
                    if(err){
                        console.error('zlib.gunzip, error:',err);
                        return reject(res.status(404).send({message: 'No unzip pbf'}));
                    }
                    
                    var obj1 = new VectorTile(new Protobuf(buffer));
                    resolve(obj1);
                });
                //console.log('FL getTile ',data)
            });

        }
        catch (err) {
            reject(res.status(500).send({message:'db connection error'}));
        }
    });
  });
}

/*
otm endpoint:

 https://api.ontomap.eu/api/v1/instances/SchemaThing?descriptions=true&geometries=true&subconcepts=true&token=YTIyNDA2YzQtY2EyZi00N2U0LWExNzUtNmNkYjlhMDA0MmEz&applications=ontomap.eu
 &boundingbox=7.654348611831666,45.0712627079646,7.634103298187256,45.06408684697158

* @desc From tile to bbox query on otm endpoint (geojson > vtpbf > vectorTile). A tile-layer for each "hasType" object.
* @param req -> x,y,z {string} tile notation, res object
* @output pbf
*/

var otm_tile = function(req,res) {
  return new Promise(function(resolve, reject) {

    // legge i parametri di z,x,y dalla chiamata GET
    var z = req.params.z;
    var x = req.params.x;
    var y = req.params.y;

    console.log('otm_tile ',x,y,z)
    // converting x,y,z to bbox param
    // tile = [x,y,z];
    let tile = [parseInt(req.params.x),parseInt(req.params.y),parseInt(req.params.z)];
    let bbox = tilebelt.tileToBBOX(tile);
    console.log(req.params, ">",JSON.stringify(bbox));
    let query = ("&boundingbox=").concat(bbox.join(","));
    query = Object.keys(req.query).reduce(
        (query,key) => {
            // console.log('reduce',key,req.query[key],query);
            return query.concat('&',key,'=',req.query[key]);
        },query);

    console.log('query params for otm logger',query);

    let options = {
        url: otmUrl+'instances/SchemaThing?descriptions=true&geometries=true&subconcepts=true&applications=ontomap.eu'+query,
        agentOptions: {
            cert: uwum_cert,
            key: uwum_key
        },
        headers: {"Content-Type": "application/json"},
        method: 'GET'
    };

    console.log('query to OTM logger: ',options.url);
    request(options, function (error, result, body) {
        if (error) {
            console.log("ERRORE: ",error);
            return reject(res.status(404).send({message: 'not found'}));
        } else {
            // console.log(ok);
            
            var body_json = JSON.parse(body);

            var features = Object.assign(body_json.features);
            let new_o = {};
            var new_features = features.reduce(function(res_f,feature){
                
                if('hasType' in feature.properties && feature.properties.hasType.length > 0){
                    let new_f = Object.assign(feature);
                    let new_l = Object.assign(feature.properties.hasType);

                    if(new_l in new_o) 
                    {
                        new_o[new_l].push(new_f)
                    }
                    else
                    {
                        new_o[new_l] = [];
                        new_o[new_l].push(new_f)
                    }
                    
                    res_f.push(new_o);
                }

                return res_f;
            },[]);

            let buff_layers = {};
            for (var key_l in new_features[0]) {
                let new_geo = { "type": "FeatureCollection","features": []};
                //console.log('check',new_features);
                new_geo.features = Object.assign(new_features[0][key_l]);
            
                // let tileIndex  = geojsonvt(JSON.parse(body));

                let tileIndex = geojsonvt(new_geo, {
                    maxZoom: z,  // max zoom to preserve detail on
                    debug: 0    // logging level (0 to disable, 1 or 2)
                    //indexMaxZoom: z,        // max zoom in the initial tile index
                });
                
                //console.log(tileIndex.tileCoords,key_l) 
                // [{z: 0, x: 0, y: 0}]
                let z_t = Object.assign(tileIndex.tileCoords[0].z);
                let x_t = Object.assign(tileIndex.tileCoords[0].x);
                let y_t = Object.assign(tileIndex.tileCoords[0].y);
                let tile_vt = Object.assign(tileIndex.getTile(z_t, x_t, y_t));

                // se non trovo la tile
                if (!tile_vt) {
                    return reject(res.status(404).send({message: 'Missing tile OTM'}));
                }
                else{

                    buff_layers[key_l] = tile_vt;
                }
            }
            var buff = vtpbf.fromGeojsonVt(buff_layers)
            console.log('OTM getTile ',z,x,y);
            //console.log('OTM getTile ',buff);
            //res.status(200).send(buff);
            var obj2 = new VectorTile(new Protobuf(buff));
            resolve(obj2);
        }
    });
  });
}

/* ----------------------------------------------------------------------
 /  read and return an area from mbTiles - STEFANIA 
 /  @params
 /  @output area tile
 / ---------------------------------------------------------------------- */

app.get('/area/:z/:lon/:lat', function (req, res) {

    // legge i parametri di z,x,y dalla chiamata GET
    var zoom = req.params.z;
    var lon = req.params.lon;
    var lat = req.params.lat;

    

    if (!obj) {
        console.error('cannot load source mapping')
        return res.status(404).send('nothing to load');
    }

    //Stabilisce quale mbtile richiamare dal file di mapping rispetto al livello di zoom
    // default : Global (nel caso in cui z > tile_maxzoom si otterrà comunque "Missing Tile")
    var file_list = obj[zoom];
    console.log(file_list)
    var file = 'Global.mbtiles'

    // controlla se le cordinate lon:lat rientrano nella bbox del file mbtile
    for(t in file_list){

        var poly = bboxPolygon(file_list[t][0]);
  
        var pt = turf.point([lon, lat]);

        var check = turf.inside(pt,poly)

        if (check) {
            file = t
            break;
        }
    }
    console.log(file)
    
    // converte le cordinate lon:lat:zoom nella tile x:y:z del file mbtile
    var tile = tilebelt.pointToTile(lon, lat, zoom);
    var x = tile[0];
    var y = tile[1];
    var z = tile[2];
    var tileId = x+':'+y+':'+z;

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

                console.log(err, data,tileId)

                // se non trovo la tile
                if (err) {
                    return res.status(200).send({id:tileId});
                    // return res.status(404).send({message: 'Missing tile'});
                }

                var mbtilesfilename = file;
                sh.cd('mbtiles/');
                var cmd = sh.exec('tippecanoe-decode ' + mbtilesfilename + ' ' + z + ' ' + x + ' ' + y, {silent: true});
                var areasInTile = cmd.stdout;

                var code = cmd.code;

                if (code === 0) {

                    var features = JSON.parse(areasInTile).features;
                    var checkFt = [];
                    // individua l'area che contiene il punto nella tile x:y:z del file mbtile
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
                                    "coordinates": [lon, lat]
                                }, polygon)
                                if (check) {
                                    //console.log(ft,"MULTIPOLYGON",features[ft])
                                    checkFt.push(features[ft])
                                }
                            }
                        }

                        if (geoType.toUpperCase() === "POLYGON") {

                            var check = gju.pointInPolygon({"type": "Point", "coordinates": [lon, lat]}, geom)
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
                        // in caso di coesistenza di piu layer vince quello con "z_index" maggiore
                        if (z_index > check_Z) {
                            check_Z = z_index;
                            var area_id = checkFt[p_area].properties;
                            //console.log(check_Z,checkFt[p_area].properties.id)
                        }
                    }

                    res.status(200).send({id:area_id.id});
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


// informazioni sulle aree
// app.get('/areas/:id', function (req, res) {
//
//     // legge il parametro :id
//     var areaId = req.params.id;
//
//     session
//         .run('MATCH (a:Areas {areaId:$id}) return a.areaId as areaId, a.geojson as geojson', {id:areaId})
//         .then(function (result) {
//             var rst={
//             };
//             result.records.forEach(function (record) {
//                 console.log(record.get('areaId'));
//                 rst=JSON.parse(record.get('geojson'));
//             });
//             res.status(200).json(rst)
//         })
//         .catch(function (error) {
//             console.log(error);
//             res.status(500).json(error);
//         });
// });

// informazioni sulle aree
app.get('/areas/:id', function (req, res) {

    // legge il parametro :id
    var areaId = req.params.id;
    console.log('searching area with id ',areaId);
    collection.find(
        {"_id":areaId}
    ).toArray(function (err, docs) {
        if (!err) {
            if (docs.length>0) {
                res.status(200).json(docs[0]);
            } else {
                res.status(404).json({message:"Area "+areaId+" not found"})
            }
        } else {
            res.status(500).json({error: err})
        }

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


app.use('/libs' ,express.static(__dirname + '/explore/libs'));
app.get('/explore', function (req, res) {
    res.sendfile(__dirname + '/explore/index.html');
});
// listner on port
app.listen(defaultPort, function () {
    console.log('Tile server is running on port:',defaultPort);
});


