# FirstLife Tileserver

V1.0 of FirstLife tile server

#### To install tileserver
```
npm install
```
#### To create/regenerate tileserver
```
gulp build
```
#### To test tileserver
```
node server.js
http://localhost:3095/explore
```
#### How to add a new zone
1. Create a new directory for the new zone in **_../tileserver/geojson_** whit the source data files (eg. geojson from osm)

2. Add the new path/files to load in the **_gulpfile.js_** task **_'load_source_geojson'_** :
    ```
    gulp.task('load_source_geojson',function () {
    ...
    ...
    // carico i file osm di Southwark
    try {
        var southwark_dir = geojsonpath + "/southwark_osm_geojson/"
        var southwark_files = fs.readdirSync(southwark_dir);
    } catch (err) {
        console.error('directory read error ', err);
        throw new gutil.PluginError({
            plugin: 'readdireSync',
            message: geojsonpath+" directory read error"
        });
    }
    console.log('files to read: ',southwark_files.length);
    ...
    ...
    ...
    case "Southwark":
    	// ciclo i file di Southwark
    	if(southwark_files.includes(file_name)){
    	    try{
    	        // carico e parsifico il file
    	        var ft_col = fse.readJsonSync(southwark_dir+file_name);
    	        var features = ft_col.features;
    	        var ok = true;
    	    }catch (err){
    	        console.error('error ',err,' loading ',southwark_dir+file_name);
    	    }
    	}
    	break;
    ```
3. Add the new files for the generation of the tiles in the **_config_file.json_** :
    ```
      "Southwark": {
        "tile_minzoom": 13,
        "tile_maxzoom": 20,
        "files": [{
            "name": "southwark_admin.geojson",
            "minzoom": 13,
            "maxzoom": 16,
            "layer": "comune",
            "z_index": 5
          },
          {
            "name": "southwark_buildings.geojson",
            "minzoom": 17,
            "maxzoom": 20,
            "layer": "building",
            "z_index": 10
          },
          ...
    ```
4. Regenerate tileserver
    ```
    gulp build
    ```

#### To test tileserver APIs :
- Get tile from point **``z/x/y``**
    >Read and return a mbTiles
    req. param.  z,x,y {string} in tile notation
    output zipped pbf

    ```
    http://localhost:3095/tile/z/x/y
    ```
    **example:**
    http://localhost:3095/tile/10/533/368
    
- Get Area from point **``z/lon/lat``**
    >Read and return an area from mbTiles
    req. param.  z,lon,lat {string} in coordinates notation
    output area tile
    ```
    http://localhost:3095/area/z/lon/lat
    ```
    
    **example:**
    http://localhost:3095/area/12/7.692607641220094/45.08807547183474
    
- Get areas info from **``areaId``**
    >Read and return areas info from its id
    req. param. areas id {string}
    output areas info
    ```
    http://localhost:3095/areas/areaId
    ```
    
    **example:**
    http://localhost:3095/area/88fba3ae-5820-11e7-b54e-c57635f3f5a1
    

#### How to verify/correct a new file source for the zone:
- [http://geojson.io](http://geojson.io)
- [www.qgis.org](https://www.qgis.org/it/site/)

``NOTE`` :
- The accuracy of the zoom levels for tile generation in **_config_file.json_** is _``NOT``_ standard but empirical. When adding a new area, you must visually check the correct setting. 
- Be careful about using exact layer names.

#### Licensing
Author: Stefania Buccoliero
Author: Alessio Antonini
