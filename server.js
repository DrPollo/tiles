/* ---------------------------------------------------------------------- 
/	express 
/ ---------------------------------------------------------------------- */
var express = require('express');
var router = express.Router();
var fs = require('fs');
var Promise = require('promise');
var path = require('path');
var app = express();

/* ---------------------------------------------------------------------- 
/	omnivore
/ ---------------------------------------------------------------------- */

var tilelive = require('@mapbox/tilelive');
var Omnivore = require('@mapbox/tilelive-omnivore');
var mbtile = require('mbtiles');
var filepath = __dirname+'/geojson/';
var uri = 'omnivore://' + filepath;
var uriMB = __dirname+'/output.mbtiles';
var VectorTile = require('vector-tile').VectorTile;
var Protobuf  = require('pbf');
var zlib = require('zlib');
var merge = require('./fl_merge');



// new Omnivore(uri, function(err, source) {
//   var readable = tilelive.createReadStream(source,{type:'pyramid',job:{total:4,num:1}, maxzoom:8, minzoom:8});
//   var tile = new VerctorTile(new Protobuf(data) )
//   new mbtile(uriMB, function(err,sink){
//     var writable = tilelive.createWriteStream(sink);
//     readable.pipe(writable);
//   })
//   source.getInfo(function(err, info) {
//     console.log(info);
//   });


// });


/* ---------------------------------------------------------------------- 
/	read and return a tile in pbf format
/	@params
/	@output pbf layer
//  to test
//  http://localhost:3095/tile/z/13/x/4268/y/2944
/ ---------------------------------------------------------------------- */

app.get('/tile/:z/:x/:y', function(req, res) {
	console.log(req.params);

	var z = req.params.z;
	var x = req.params.x;
	var y = req.params.y;

	new Omnivore(uri, function(err, src) {
		try{
			src.getTile(z, x, y, function(err, data){
				//src.getTile(13, 4268, 2944 , function(err, data){
				var pbf = new Protobuf(data);

				zlib.gunzip(data, function(err, unzipped) {
					console.log('unzipped',unzipped);
			        if (err) return t.end(err);
			        var tile = new VectorTile(new Protobuf(unzipped));
			        return res.send(tile.layers);
				});
			});
            src.close(function(err){
                console.log(err);
            });
		}
		catch(err){
			console.log('error');
		}	
	});

});


/* ---------------------------------------------------------------------- 
/	description
/	@params
/	@output
/ ---------------------------------------------------------------------- */


// respond with "hello world" when a GET request is made to the homepage
app.get('/', function (req, res) {

    var promise  = new Promise(function (resolve, reject) {

            var results = [];
            fs.readdir(filepath, function (err, list) {
                if (err) return reject(done(err));

                var pending = list.length;
                if (!pending) return done(null, results);
                list.forEach(function (file) {
                    file = path.resolve(filepath, file);
                    results.push(file);
                    });
                resolve(results);
                });
    }).then(function(results){
    	//console.log('resultFine', results);
    	merge.fl_merge(results);
	});
    res.send('merge');


});

app.listen(3095, function () {
  console.log('Example app listening on port 3095!');
});


