var tilelive = require('@mapbox/tilelive');
var Omnivore = require('@mapbox/tilelive-omnivore');
var mbtile = require('mbtiles');
var filepath = __dirname+'/geojson/level_6.geojson';
var uri = 'omnivore://' + filepath;
var uriMB = __dirname+'/output.mbtiles'

new Omnivore(uri, function(err, source) {
  var readable = tilelive.createReadStream(source,{type:'pyramid',job:{total:4,num:1}, maxzoom:8, minzoom:8});
  new mbtile(uriMB, function(err,sink){
    var writable = tilelive.createWriteStream(sink);
    readable.pipe(writable);
  })
  source.getInfo(function(err, info) {
    console.log(info);
  });
});

