/* ----------------------------------------------------------------------
 /	express
 / ---------------------------------------------------------------------- */
var express = require('express');
var router = express.Router();
var app = express();
var fs = require('fs');
var Promise = require('promise');

var tilelive = require('@mapbox/tilelive');
var Omnivore = require('@mapbox/tilelive-omnivore');
var mbtile = require('mbtiles');
var path = require('path');
var geojsonExtent = require('geojson-extent');


var fd =  __dirname + '/geojson/level_13.geojson';
var filepath = __dirname +'/geojson/tilemap.json';

var omniUri = 'omnivore://';
var uriMB = __dirname+'/output.mbtiles';
var VectorTile = require('vector-tile').VectorTile;
var Protobuf  = require('pbf');
var zlib = require('zlib');


// new Omnivore(uri, function(err, source) {
//   var readable = tilelive.createReadStream(source,{type:'pyramid',job:{total:4,num:1}, maxzoom:8, minzoom:8});
//   var tile = new VerctorTile(new Protobuf(data) )
//   new mbtile(uriMB, function(err,sink){
//     var writable = tilelive.createWriteStream(sink);
//     readable.pipe(writable);
//   })
//   source.getInfo(function(err, infgit o) {
//     console.log(info);
//   });
// });

/*----------------------------------------*/

app.get('/render', function(req, res) {


    var folder = fd;
    fs.readFile(folder, 'utf8', function (err, data) {
        if (err) throw err;
        obj = JSON.parse(data);
        console.log(geojsonExtent(obj));
    });


    // fs.readdir(folder, function(err, files){
    //     if (err) {
    //         throw err;
    //     }
    //     files.map(function (file) {
    //         return path.join(folder, file);
    //     }).filter(function (file) {
    //         return fs.statSync(file).isFile();
    //     }).forEach(function (file) {
    //         console.log("%s (%s)", file, path.extname(file));
    //         console.log(geojsonExtent(file));
    //     });
    //
    //
    // })

});


/* ----------------------------------------------------------------------
 /	read and return a tile in pbf format
 /	@params
 /	@output pbf layer
 //  to test
 //  http://localhost:3095/tile/z/13/x/4268/y/2944
 / ---------------------------------------------------------------------- */

app.get('/tile/:z/:x/:y', function(req, res) {
    //console.log(req.params);

    var z = req.params.z;
    var x = req.params.x;
    var y = req.params.y;

    var zoom_map = filepath;
    var z =  req.params.z;
    var obj;

    new Promise(function (resolve, reject) {

       fs.readFile(zoom_map, 'utf8', function (err, data) {
            if (err) throw err;
            var obj = JSON.parse(data);
            var result ;
            for (var prop in obj) {
                var min = obj[prop].minzoom;
                var max = obj[prop].maxzoom;
                if(z >= min && z <= max) {
                    result = obj[prop].tiles;
                }
            }
            resolve(result);
        });

    }).then(function(file){

        var uri = omniUri.concat(__dirname, '/geojson/',file);
        console.log(uri);

        new Omnivore(uri, function(err, src) {
            try{
                src.getTile(z, x, y, function(err, data){
                    //src.getTile(13, 4268, 2944 , function(err, data){
                    var pbf = new Protobuf(data);
                    console.log('pbf' , pbf);

                    // zlib.gunzip(data, function(err, unzipped) {
                    //     //console.log('unzipped',unzipped);
                    //     if (err) return res.send('no tile');
                    //     var tile = new VectorTile(new Protobuf(unzipped));
                    //     return res.status(200).send(tile.layers);

                    //     // src.close(function(err){
                    //     //     console.log(err);
                    //     // });
                    // });

                });
                res.setHeader('Content-Encoding', 'gzip');
                res.setHeader('Access-Control-Allow-Origin:','*');
                res.setHeader('Content-Type','application/x-protobuf');
                return res.status(200).send(pbf.buf);
            }
            catch(err){
                res.status(500).send('error');
            }
        });

    });

});


/* ----------------------------------------------------------------------
 /	description
 /	@params
 /	@output
 / ---------------------------------------------------------------------- */

// respond with "hello world" when a GET request is made to the homepage
app.get('/', function(req, res) {
    res.send('Tile server is running');
});




app.listen(3095, function () {
    console.log('Tile server is running on port: 3095');
});


