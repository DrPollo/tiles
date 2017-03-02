var Omnivore = require('@mapbox/tilelive-omnivore');
var filepath = __dirname+'/geojson/level_6.geojson';
var uri = 'omnivore://' + filepath;

new Omnivore(uri, function(err, source) {
  source.getInfo(function(err, info) {
    console.log(info);
  });
});

