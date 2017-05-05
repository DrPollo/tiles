/* ----------------------------------------------------------------------
 /	express
 / ---------------------------------------------------------------------- */
var express = require('express');
var app = express();
var fs = require('fs');

var tilelive = require('@mapbox/tilelive');
var MBTiles = require('mbtiles');
var path = require('path');
var mbtilespath = '/mbtiles/';
var filepath = __dirname +mbtilespath+'sourcemap.json';

var MBtileUri = 'mbtiles://';
var zlib = require('zlib');

tilelive.protocols['mbtiles:'] = require('mbtiles');

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

    if(!obj){
        console.error('cannot load source mapping')
        return res.status(404).send('nothing to load');
    }


    var file = obj[z];


    // setta il riferimento uri al file mbTile
    var uri = MBtileUri.concat(__dirname,mbtilespath,file);
    console.log(uri);

    // carica l'mbTile dal riferimento uri
    new MBTiles(uri, function(err, src) {
        try{
            // recupera la tile sulle coordinate z, x, y
            src.getTile(z, x, y, function(err, data){

                res.setHeader('Access-Control-Allow-Origin','*');

                console.log(err, data)
                // todo invio tile vuota
                // se non trovo la tile
                if(err){
                    return res.status(404).send({message:'Missing tile'});
                }

                // console.log('getTile',z,x,y,data);
                res.setHeader('Content-Type','application/x-protobuf');
                res.setHeader('Content-Encoding', 'gzip');
                res.status(200).send(data);
            });

        }
        catch(err){
            res.status(500).send('db connection error');
        }
    });

});


// init tile server
app.get('/', function(req, res) {
    res.send('Tile server is running');
});
// listner on port
app.listen(3095, function () {
    console.log('Tile server is running on port: 3095');
});


