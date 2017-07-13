var UUID = require('uuid');
var gulp = require('gulp');
var gutil = require('gulp-util');
var concat = require('gulp-concat');
var rename = require('gulp-rename');
var sh = require('shelljs');
var override = require('json-override');
var fs = require('fs');
var fse = require('fs-extra');
var sequence = require('run-sequence');
var env = require('gulp-env');
var jsonMinify = require('gulp-jsonminify');

var geojsonpath = './geojson/';
var tippecanoepath = 'tippecanoe/';
var tippecanoepathLabels = 'tippecanoepathLabels/'
var minpath = 'min/';
var sourcemap = 'sourcemap.json';
var admin_level_map = 'admin_level_map.json';
var mbtilespath = 'mbtiles/';
var polygonCenter = require('geojson-polygon-center');
var geojsonArea = require('geojson-area');

gulp.task('build',['load_static_geojson','load_osm_geojson','generatembtile','updatedb']);

gulp.task('load_static_geojson',function () {

    console.log('/*********load_static_geojson*********/')
    // carico i file environment
    try {
        var sources = fse.readJsonSync(geojsonpath+sourcemap);
    } catch (err) {
        console.error('directory read error ', err);
        throw new gutil.PluginError({
            plugin: 'readFileSync',
            message: geojsonpath+sourcemap+" read error"
        });
    }

    // carico il file di admin_level_map
    try {
        var admin_map = fse.readJsonSync(geojsonpath+admin_level_map);
    } catch (err) {
        console.error('directory read error ', err);
        throw new gutil.PluginError({
            plugin: 'readFileSync',
            message: geojsonpath+admin_level_map+" read error"
        });
    }

    // carico i file geosjon "statici"
    try {
        var static_dir = geojsonpath + "/static/"
        var static_files = fs.readdirSync(static_dir);
    } catch (err) {
        console.error('directory read error ', err);
        throw new gutil.PluginError({
            plugin: 'readdireSync',
            message: geojsonpath+" directory read error"
        });
    }

    console.log('files to read: ',static_files.length);
    // creo le directory per i file
    fse.ensureDirSync(geojsonpath+tippecanoepath);
    fse.ensureDirSync(geojsonpath+tippecanoepathLabels);

    // ciclo i file in static
    for(var i in static_files) {
        var file = static_files[i];
        if(file.search('.geojson') !== -1 ) {
            console.log('reading static file ',file);

            if(file in sources){

                try{
                    // carico e parsifico il file
                    var features = fse.readJsonSync(static_dir+file).features;
                    var ok = true;
                }catch (err){
                    console.error('error ',err,' loading ',static_dir+file);
                }

                if(ok){
                    var zoom_min = 22;
                    var zoom_max = 0;
                    for(var a in admin_map){
                        if(admin_map[a].files.includes(file)){
                            if(admin_map[a].minzoom < zoom_min) zoom_min = admin_map[a].minzoom;
                            if(admin_map[a].maxzoom > zoom_max) zoom_max = admin_map[a].maxzoom;
                        }
                    }
                    console.log(file,zoom_min,zoom_max)
                    var newFeatures = features.map(function(feature){

                        feature.properties.id = UUID.v1();
                        feature.properties.type = sources[file].layer;
                        feature.properties.zoom_min = zoom_min;
                        feature.properties.zoom_max = zoom_max;
                        feature.properties.z_index = sources[file].z_index;

                        feature['tippecanoe'] = {
                            "maxzoom" : sources[file].maxzoom,
                            "minzoom" : sources[file].minzoom,
                            "layer" : sources[file].layer
                        };
                        try {
                            delete feature.properties.bbox;
                            delete feature.properties.geometry;
                        }catch (err){

                        }
                        return feature;
                    });

                    try {
                        // cancello il file
                        fs.unlinkSync(geojsonpath+tippecanoepath+file);

                    }catch (err){
                        console.log('nothing to delete');
                    }
                    try{
                        // scrivo il file
                        fse.writeJsonSync(geojsonpath+tippecanoepath+file,newFeatures);
                    }catch (err){
                        console.error('ERROR: cannot generate file ',file, " in ", geojsonpath+tippecanoepath);
                    }

                    var newFeaturesLabels = features.map(function(feature){

                        var center = polygonCenter(feature.geometry);
                        feature.properties.id = UUID.v1();
                        feature.properties.type = sources[file].layer;

                        feature.geometry = center;

                        feature['tippecanoe'] = {
                            "maxzoom" : sources[file].maxzoom,
                            "minzoom" : sources[file].minzoom,
                            "layer" : sources[file].layer+"_labels"
                        };

                        try {
                            delete feature.properties.bbox;
                            delete feature.properties.geometry;
                            delete feature.properties.zoom_min;
                            delete feature.properties.zoom_max;
                        }catch (err){

                        }
                        return feature;
                    });

                    try {
                        // cancello il file _labels
                        fs.unlinkSync(geojsonpath+tippecanoepathLabels+"labels_"+file);
                    }catch (err){
                        console.log('nothing to delete');
                    }
                    try{
                        // scrivo il file _labels
                        fse.writeJsonSync(geojsonpath+tippecanoepathLabels+"labels_"+file,newFeaturesLabels);
                    }catch (err){
                        console.error('ERROR: cannot generate file ',file, " in ", geojsonpath+tippecanoepathLabels);
                    }

                }
            }

        }
    }

});

gulp.task('load_osm_geojson',function () {
    console.log('/*********load_osm_geojson*********/')
    // carico i file environment
    try {
        var sources = fse.readJsonSync(geojsonpath+sourcemap);
    } catch (err) {
        console.error('directory read error ', err);
        throw new gutil.PluginError({
            plugin: 'readFileSync',
            message: geojsonpath+sourcemap+" read error"
        });
    }

    // carico il file di admin_level_map
    try {
        var admin_map = fse.readJsonSync(geojsonpath+admin_level_map);
    } catch (err) {
        console.error('directory read error ', err);
        throw new gutil.PluginError({
            plugin: 'readFileSync',
            message: geojsonpath+sourcemap+" read error"
        });
    }

    // carico i file geosjon "osm"
    try {
        var osm_dir = geojsonpath + "/turin_italy_osm_geojson/"
        var osm_files = fs.readdirSync(osm_dir);
    } catch (err) {
        console.error('directory read error ', err);
        throw new gutil.PluginError({
            plugin: 'readdireSync',
            message: geojsonpath+" directory read error"
        });
    }

    console.log('files to read: ',osm_files.length);
    // creo le directory per i file
    fse.ensureDirSync(geojsonpath+tippecanoepath);
    fse.ensureDirSync(geojsonpath+tippecanoepathLabels);

    // ciclo i file 
    for(var i in osm_files) {
        var file = osm_files[i];
        if(file.search('.geojson') !== -1 ) {
            console.log('reading osm file ',file);

            if(file in sources){

                try{
                    // carico e parsifico il file
                    var features = fse.readJsonSync(osm_dir+file).features;
                    var ok = true;
                }catch (err){
                    console.error('error ',err,' loading ',osm_dir+file);
                }

                if(ok){
                    var zoom_min = 22;
                    var zoom_max = 0;
                    for(var a in admin_map){
                        if(admin_map[a].files.includes(file)){
                            if(admin_map[a].minzoom < zoom_min) zoom_min = admin_map[a].minzoom;
                            if(admin_map[a].maxzoom > zoom_max) zoom_max = admin_map[a].maxzoom;
                        }
                    }
                    var newFeatures = features.map(function(feature){
                        feature.properties.id = UUID.v1();
                        feature.properties.type = sources[file].layer;
                        feature.properties.zoom_min = zoom_min;
                        feature.properties.zoom_max = zoom_max;
                        feature.properties.z_index = sources[file].z_index;

                        feature['tippecanoe'] = {
                            "maxzoom" : sources[file].maxzoom,
                            "minzoom" : sources[file].minzoom,
                            "layer" : sources[file].layer
                        };
                        try {
                            delete feature.properties.bbox;
                            delete feature.properties.geometry;
                        }catch (err){

                        }
                        return feature;
                    });

                    try {
                        // cancello il file
                        fs.unlinkSync(geojsonpath+tippecanoepath+file);
                  
                    }catch (err){
                        console.log('nothing to delete');
                    }
                    try{
                        // scrivo il file
                        fse.writeJsonSync(geojsonpath+tippecanoepath+file,newFeatures);
                       
                    }catch (err){
                        console.error('ERROR: cannot generate file ',file, " in ", geojsonpath+tippecanoepath);
                    }

                    var newFeaturesLabels = features.map(function(feature){

                        feature.properties.id = UUID.v1();
                        feature.properties.type = sources[file].layer;
                        
                        var geoType = feature.geometry.type;
                        var geom=feature.geometry;
                        var area = 0;
                        var max_area = 0

                        if(geoType.toUpperCase() === "MULTIPOLYGON"){
                            for (var i=0; i < geom.coordinates.length; i++){
                                  var polygon = {
                                       'type':'Polygon', 
                                       'coordinates':geom.coordinates[i]};

                                  area = geojsonArea.geometry(polygon);

                                  if(area > max_area){
                                       max_area = area;
                                       var center = polygonCenter(polygon);
                                  }
                              }
                        }
                        else{
                            var center = polygonCenter(feature.geometry);
                        }
                            

                        feature.geometry = center;

                        feature['tippecanoe'] = {
                            "maxzoom" : sources[file].maxzoom,
                            "minzoom" : sources[file].minzoom,
                            "layer" : sources[file].layer+"_labels"
                        };

                        try {
                            delete feature.properties.bbox;
                            delete feature.properties.geometry;
                            delete feature.properties.geom;
                            delete feature.properties.zoom_min;
                            delete feature.properties.zoom_max;
                        }catch (err){

                        }
                        return feature;
                    });
                    try {
                        // cancello il file _labels
                        fs.unlinkSync(geojsonpath+tippecanoepathLabels+"labels_"+file);
                    }catch (err){
                        console.log('nothing to delete');
                    }
                    try{
                        // scrivo il file _labels
                        fse.writeJsonSync(geojsonpath+tippecanoepathLabels+"labels_"+file,newFeaturesLabels);
                    }catch (err){
                        console.error('ERROR: cannot generate file ',file, " in ", geojsonpath+tippecanoepathLabels);
                    }
                }
            }

        }
    }
});

gulp.task('generatembtile',function() {
    console.log('/*********generatembtile*********/')

    // carico i file environment
    try {
        var sources = fse.readJsonSync(geojsonpath+sourcemap);
    } catch (err) {
        console.error('directory read error ', err);
        throw new gutil.PluginError({
            plugin: 'readFileSync',
            message: geojsonpath+sourcemap+" read error"
        });
    }

    // carico il file di admin_level_map
    try {
        var admin_map = fse.readJsonSync(geojsonpath+admin_level_map);
    } catch (err) {
        console.error('directory read error ', err);
        throw new gutil.PluginError({
            plugin: 'readFileSync',
            message: geojsonpath+sourcemap+" read error"
        });
    }

    // carico i file geosjon
    try {
        var files = fs.readdirSync(geojsonpath + tippecanoepath);
    } catch (err) {
        console.error('directory read error ', err);
        throw new gutil.PluginError({
            plugin: 'readdireSync',
            message: geojsonpath + tippecanoepath + " directory read error"
        });
    }

    console.log('files to read: ', files.length);
    // creo le directory per i file
    fse.ensureDirSync(mbtilespath);

    var mbtiles = {};

    // ciclo il mapping
    for (var i in admin_map) {

        var mbtilesfilename = i;

        var cmd = 'tippecanoe --output ' +mbtilespath+mbtilesfilename+ ' --force -pf -pk --minimum-zoom=' + admin_map[i].minzoom + ' --maximum-zoom=' + admin_map[i].maxzoom;

        for(var f in admin_map[i].files){
            console.log('reading file ', admin_map[i].files[f]);
            cmd = cmd + ' ' + geojsonpath+tippecanoepath+admin_map[i].files[f];
        }
            var code = sh.exec(cmd).code;

            if(code === 0){
                var maxzoom = admin_map[i].maxzoom,
                    minzoom = admin_map[i].minzoom;
                for(var j = minzoom; j <= maxzoom; j++){
                    mbtiles[j] = mbtilesfilename;
                }
            }
            else exit;

            console.log('generating mbtiles from ',cmd,' with result: ', (code ===0) ?'ok': 'error code'+code);
    }
    try {
        fs.unlinkSync(mbtilespath + sourcemap);
    }catch (err){
        console.log('nothing to delete');
    }
    try{
        fse.writeJsonSync(mbtilespath+sourcemap,mbtiles);
    }catch (err){
        console.error('write file error ', err);
        throw new gutil.PluginError({
            plugin: 'writeJsonSync',
            message: mbtilespath + sourcemap + " file write error"
        });
    }

});


gulp.task('updatedb',function () {
    console.log('start of updatedb');

    var cmd = 'python ./scriptMongo/import_areas.py';

    var code = sh.exec(cmd).code;

    if(code === 0){
        console.log('updatedb ok');
    }else{
        console.error('error',code);
    }

    console.log('end of updatedb')
});