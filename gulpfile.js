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
var minpath = 'min/';
var sourcemap = 'sourcemap.json';
var mbtilespath = 'mbtiles/';

gulp.task('build',['loadgeojson','generatembtile']);


gulp.task('loadgeojson',function () {
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

    // carico i file geosjon
    try {
        var files = fs.readdirSync(geojsonpath);
    } catch (err) {
        console.error('directory read error ', err);
        throw new gutil.PluginError({
            plugin: 'readdireSync',
            message: geojsonpath+" directory read error"
        });
    }
    console.log('files to read: ',files.length);
    // creo le directory per i file
    fse.ensureDirSync(geojsonpath+tippecanoepath);
    // ciclo i file
    for(var i in files) {
        var file = files[i];
        if(file.search('.geojson') !== -1 ) {
            console.log('reading file ',file);

            try{
                // carico e parsifico il file
                var features = fse.readJsonSync(geojsonpath+file).features;
                var ok = true;
            }catch (err){
                console.error('error ',err,' loading ',geojsonpath+file);
            }

            if(ok){
                var newFeatures = features.map(function(feature){
                    feature['tippecanoe'] = {
                        "maxzoom" : sources[file].maxzoom,
                        "minzoom" : sources[file].minzoom,
                        "layer" : sources[file].layer
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
                try{
                    // cancello il file
                    fs.unlinkSync(geojsonpath+tippecanoepath+file);
                    // scrivo il file
                    fse.writeJsonSync(geojsonpath+tippecanoepath+file,newFeatures);
                }catch (err){
                    console.error('ERROR: cannot generate file ',file, " in ", geojsonpath+tippecanoepath);
                }
            }

        }
    }

});

gulp.task('generatembtile',function() {
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
    // ciclo i file
    for (var i in files) {
        var file = files[i];
        if (file.search('.geojson') !== -1) {
            console.log('reading file ', file);
            var mbtilesfilename = file.slice(0,-8)+'.mbtiles';
            var cmd = 'tippecanoe --output ' +mbtilespath+mbtilesfilename+ ' --force --minimum-zoom=' + sources[file].minzoom + ' --maximum-zoom=' + sources[file].maxzoom + ' ' + geojsonpath+tippecanoepath+file;

            var code = sh.exec(cmd).code;
            if(code === 0){
                var maxzoom = sources[file].maxzoom,
                    minzoom = sources[file].minzoom;
                for(var j = minzoom; j <= maxzoom; j++){
                    mbtiles[j] = mbtilesfilename;
                }
            }
            console.log('generating mbtiles from ',file,' with result: ', (code ===0) ?'ok': 'error code'+code);
        }
    }
    try{
        fs.unlinkSync(mbtilespath+sourcemap);
        fse.writeJsonSync(mbtilespath+sourcemap,mbtiles);
    }catch (err){
        console.error('write file error ', err);
        throw new gutil.PluginError({
            plugin: 'writeJsonSync',
            message: mbtilespath + sourcemap + " file write error"
        });
    }

});