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
var tilebelt = require('@mapbox/tilebelt');


var bbox = require('@turf/bbox');


var geojsonpath = './geojson/';
var tippecanoepath = 'tippecanoe/';
var tippecanoepathLabels = 'tippecanoepathLabels/'
var config_file = 'config_file.json';
var mbtilespath = 'mbtiles/';
var tiles_map = 'tiles_map.json';
var polygonCenter = require('geojson-polygon-center');
var geojsonArea = require('geojson-area');
var tiles_bbox = {}

var mongoDB = 'fl_v2';
var mongoCollection = 'area';



gulp.task('build',['load_source_geojson','generatembtile','updatedb']);

gulp.task('load_source_geojson',function () {

    console.log('/*********load_static_geojson*********/')
    // carico i file Globali
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

    console.log('/*********load_turin_geojson*********/')
    // carico i file osm di Torino
    try {
        var turin_dir = geojsonpath + "/turin_italy_osm_geojson/"
        var turin_files = fs.readdirSync(turin_dir);
    } catch (err) {
        console.error('directory read error ', err);
        throw new gutil.PluginError({
            plugin: 'readdireSync',
            message: geojsonpath+" directory read error"
        });
    }
    console.log('files to read: ',turin_files.length);

    console.log('/*********load_SanDonaDiPiave_geojson*********/')
    // carico i file osm di SanDonaDiPiave
    try {
        var sanDonaDiPiave_dir = geojsonpath + "/SanDonaDiPiave/"
        var sanDonaDiPiave_files = fs.readdirSync(sanDonaDiPiave_dir);
    } catch (err) {
        console.error('directory read error ', err);
        throw new gutil.PluginError({
            plugin: 'readdireSync',
            message: geojsonpath+" directory read error"
        });
    }
    console.log('files to read: ',sanDonaDiPiave_files.length);

    // carico il config_file
    console.log('/*********load_config_file********/')
    try {
        var config = fse.readJsonSync(geojsonpath+config_file);
    } catch (err) {
        console.error('directory read error ', err);
        throw new gutil.PluginError({
            plugin: 'readFileSync',
            message: geojsonpath+config_file+" read error"
        });
    }


    // creo la directory radice per i file
    fse.ensureDirSync(geojsonpath+tippecanoepath);
    fse.ensureDirSync(geojsonpath+tippecanoepathLabels);


    for(var c in config){
        console.log("c: ",c);
        var new_dir = c+'/';

        zoom_min = config[c].tile_minzoom;
        zoom_max = config[c].tile_maxzoom;

        // creo le directory per i file
        fse.ensureDirSync(geojsonpath+tippecanoepath+c);

        for(var f in config[c].files){

            console.log(config[c].files[f].name)

            var file_name = config[c].files[f].name;

            switch (c)
           {
                case "Global":
                    // ciclo i file in static

                    if(static_files.includes(file_name)){

                        try{
                            // carico e parsifico il file
                            var features = fse.readJsonSync(static_dir+file_name).features;
                            var ok = true;
                        }catch (err){
                            console.error('error ',err,' loading ',static_dir+file_name);
                        }
                    }
                
                    break;
                case "Torino":
                    // ciclo i file di Torino
                    if(turin_files.includes(file_name)){
                        try{
                            // carico e parsifico il file
                            var ft_col = fse.readJsonSync(turin_dir+file_name);
                            var features = ft_col.features;
                            var ok = true;
                        }catch (err){
                            console.error('error ',err,' loading ',turin_dir+file_name);
                        }
                    }
                    break;
                case "SanDonaDiPiave":
                    // ciclo i file di SanDonaDiPiave
                    if(sanDonaDiPiave_files.includes(file_name)){
                        try{
                            // carico e parsifico il file
                            var ft_col = fse.readJsonSync(sanDonaDiPiave_dir+file_name);
                            var features = ft_col.features;
                            var ok = true;
                        }catch (err){
                            console.error('error ',err,' loading ',sanDonaDiPiave_dir+file_name);
                        }
                    }
                    break;
                default:
                    break;
            }

            console.log(file_name,zoom_min,zoom_max)

            // Calcola la bbox totale del geojson 
            if(c != 'Global'){
                if(config[c].files[f].minzoom == zoom_min)
                tiles_bbox[c] = bbox(ft_col)
                console.log(c, tiles_bbox[c])
            }


            var newFeatures = features.map(function(feature){
                var id = UUID.v1();
                feature._id = id;
                feature.properties.id = id;
                feature.properties.type = config[c].files[f].layer;
                feature.properties.level = c;
                feature.properties.zoom_min = zoom_min;
                feature.properties.zoom_max = zoom_max;
                feature.properties.z_index = config[c].files[f].z_index;
                feature.properties.bbox = bbox(feature);

                // console.log(feature.properties.bbox);
                feature['tippecanoe'] = {
                    "maxzoom" : config[c].files[f].maxzoom,
                    "minzoom" : config[c].files[f].minzoom,
                    "layer" : config[c].files[f].layer
                };

                delete feature.properties.geometry;
                delete feature.id;
                var regExpr = /^@/;
                
                Object.keys(feature.properties).forEach(function(k) {

                    if(regExpr.test(k)) {
                        delete feature.properties[k]
                    }
                });

                return feature;
            });
            
            try {
                // cancello il file
                console.log('cancello il file: ',geojsonpath+tippecanoepath+new_dir+file_name);
                fs.unlinkSync(geojsonpath+tippecanoepath+new_dir+file_name);

            }catch (err){
                console.log('nothing to delete');
            }
            try{
                // scrivo il file
                console.log('scrivo il file: ',geojsonpath+tippecanoepath+new_dir+file_name);
                fse.writeJsonSync(geojsonpath+tippecanoepath+new_dir+file_name,newFeatures);
            }catch (err){
                console.error('ERROR: cannot generate file ',file_name, " in ", geojsonpath+tippecanoepath+new_dir);
            }
        }
    }

});

gulp.task('generatembtile',function() {
    console.log('/*********generatembtile*********/')

    // carico il config_file
    console.log('/*********load_config_file********/')
    try {
        var config = fse.readJsonSync(geojsonpath+config_file);
    } catch (err) {
        console.error('directory read error ', err);
        throw new gutil.PluginError({
            plugin: 'readFileSync',
            message: geojsonpath+config_file+" read error"
        });
    }

    // creo la directory radice per i file
    fse.ensureDirSync(mbtilespath);
    var mbtiles = {};

    for(var c in config){

        console.log("c: ",c);
        var new_dir = c+'/';
        var tippecanoe_dir = geojsonpath+tippecanoepath+new_dir
        var file_mbtile = c+'.mbtiles';

        zoom_min = config[c].tile_minzoom;
        zoom_max = config[c].tile_maxzoom;

        // creo le directory per i file
        //fse.ensureDirSync(mbtilespath+c);

        //var cmd = 'tippecanoe --output ' +mbtilespath+new_dir+file_mbtile+ ' --force -pf -pk --minimum-zoom=' + zoom_min + ' --maximum-zoom=' + zoom_max ;
        var cmd = 'tippecanoe --output ' +mbtilespath+file_mbtile+ ' --force -pf -pk --minimum-zoom=' + zoom_min + ' --maximum-zoom=' + zoom_max ;


        for(var f in config[c].files){

            console.log(config[c].files[f].name)

            var file_name = config[c].files[f].name;

            console.log('reading file ', tippecanoe_dir+file_name);
            cmd = cmd + ' ' + tippecanoe_dir+file_name;
        }

        var code = sh.exec(cmd).code;

        if(code === 0){

            for(var j = zoom_min; j <= zoom_max; j++){

                if(!(j in mbtiles)){
                    mbtiles[j] = {}; 
                }

                // Calcola i margini delle bbox in tile
                if(c != 'Global') {
                    var tileLow = tilebelt.pointToTile(tiles_bbox[c][0],tiles_bbox[c][1], j);
                    var xLow = tileLow[0];
                    var yLow = tileLow[1];
                    var tileHigh = tilebelt.pointToTile(tiles_bbox[c][2],tiles_bbox[c][3], j);
                    var xHigh = tileHigh[0];
                    var yHigh = tileHigh[1];
                    var t_bbox = [xLow, yLow, xHigh, yHigh]
                    mbtiles[j][file_mbtile] = [tiles_bbox[c],t_bbox];
                }
                   

                else mbtiles[j][file_mbtile] = file_mbtile;
            }
        }
        else exit;

        console.log('generating mbtiles from ',cmd,' with result: ', (code ===0) ?'ok': 'error code'+code);
    }

        try {
        fs.unlinkSync(mbtilespath + tiles_map);
    }catch (err){
        console.log('nothing to delete');
    }
    try{
        fse.writeJsonSync(mbtilespath+tiles_map,mbtiles);
    }catch (err){
        console.error('write file error ', err);
        throw new gutil.PluginError({
            plugin: 'writeJsonSync',
            message: mbtilespath + tiles_map + " file write error"
        });
    }

});

gulp.task('updatedb',function () {

    dbName = mongoDB;
    collectionName = mongoCollection;

    console.log('start of updatedb');

    // carico il config_file
    console.log('/*********load_config_file********/')
    try {
        var config = fse.readJsonSync(geojsonpath+config_file);
    } catch (err) {
        console.error('directory read error ', err);
        throw new gutil.PluginError({
            plugin: 'readFileSync',
            message: geojsonpath+config_file+" read error"
        });
    }

    for(var c in config){
    console.log("c: ",c);
    var new_dir = c+'/';
        // carico i file geosjon
        try {
            var files = fs.readdirSync(geojsonpath + tippecanoepath + new_dir);
        } catch (err) {
            console.error('directory read error ', err);
            throw new gutil.PluginError({
                plugin: 'readdireSync',
                message: geojsonpath + tippecanoepath + new_dir +" directory read error"
            });
        }

        for (var fileName in files) {
            if(c=='Global' && fileName == 0){
                var cmd = 'mongoimport --db ' +dbName+ ' --collection ' +collectionName+ ' --drop < ' +geojsonpath+tippecanoepath+new_dir+files[fileName]+ ' --jsonArray';
                var code = sh.exec(cmd).code;
                console.log(cmd);
                console.log('Areas from ',files[fileName],' with result: ', (code ===0) ?'ok': 'error code'+code);
            }
            else{
                var cmd = 'mongoimport --db ' +dbName+ ' --collection ' +collectionName+ ' < ' +geojsonpath+tippecanoepath+new_dir+files[fileName]+ ' --jsonArray';
                var code = sh.exec(cmd).code;

                console.log('Areas from ',files[fileName],' with result: ', (code ===0) ?'ok': 'error code'+code);
            }
        }
    }
    console.log('end of updatedb')
});

