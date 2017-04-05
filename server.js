/* ----------------------------------------------------------------------
 /	express
 / ---------------------------------------------------------------------- */
var express = require('express');
var router = express.Router();
var app = express();
var fs = require('fs');
var Promise = require('promise');

var tilelive = require('@mapbox/tilelive');
var MBTiles = require('mbtiles');
var path = require('path');
var mbtilespath = '/mbtiles/';
var filepath = __dirname +mbtilespath+'sourcemap.json';

var MBtileUri = 'mbtiles://';
var VectorTile = require('vector-tile').VectorTile;
var Protobuf  = require('pbf');
var zlib = require('zlib');

tilelive.protocols['mbtiles:'] = require('mbtiles');

/* ----------------------------------------------------------------------
 /  read and return a tile from mbTiles - STEFANIA 
 /  @params
 /  @output mbTiles tile
 / ---------------------------------------------------------------------- */

app.get('/tile/:z/:x/:y', function(req, res) {

    // legge i parametri di z,x,y dalla chiamata GET
    var z = req.params.z;
    var x = req.params.x;
    var y = req.params.y;

    var zoom_map = filepath;
    var obj;

    new Promise(function (resolve, reject) {

    // Stabilisce quale file mbTile interrogare rispetto al mapping degli zoom sul file mbTilesMap.json
       fs.readFile(zoom_map, 'utf8', function (err, data) {
            if (err) throw err;
            var obj = JSON.parse(data);
            // var result ;
            // for (var prop in obj) {
            //     var min = obj[prop].minzoom;
            //     var max = obj[prop].maxzoom;
            //     if(z >= min && z <= max) {
            //         result = obj[prop].tiles;
            //
            //     }
            // }
            resolve(obj[z]);
        });

    }).then(function(file){

        // setta il riferimento uri al file mbTile
        var uri = MBtileUri.concat(__dirname,mbtilespath,file);
        console.log(uri);

        // carica l'mbTile dal riferimento uri 
        new MBTiles(uri, function(err, src) {
            try{
                // recupera la tile sulle coordinate z, x, y
                src.getTile(z, x, y, function(err, data){

                    // converte il formato restituito in un oggetto PBF (zip)
                    var pbf = new Protobuf(data);
            
                    // zlib.gunzip(data, function(err, unzipped) {
                    //     //console.log('unzipped',unzipped);
                    //     if (err) return res.send('no tile');
                    //     var tile = new VectorTile(new Protobuf(unzipped));
                    //     return res.status(200).send(tile.layers);

                    //     // src.close(function(err){
                    //     //     console.log(err);
                    //     // });
                    // });

                    res.setHeader('Content-Encoding', 'gzip');
                    res.setHeader('Access-Control-Allow-Origin','*');
                    res.setHeader('Content-Type','application/x-protobuf');
                    res.status(200).send(pbf);
                });

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


