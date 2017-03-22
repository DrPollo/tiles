var async = require("async");
var tilelive = require('tilelive');

/* ---------------------------------------------------------------------- 
/ merge json function
/ @params listpath {array of files path}
/ @output
/ ---------------------------------------------------------------------- */

  Merge = function(listpath, callback) {
    var self = this;


    //this.uri = url.parse(uri, true);
    //var sourceUris = this.uri.query.source || this.uri.query.sources;

    var sourceFiles = listpath;


    if (!Array.isArray(sourceFiles)) {
      return setImmediate(callback, new Error("Two or more sources must be provided: "));
    }


    // TODO pass scale
    return async.reduce(sourceFiles, [], function(sources, file, next) {

        console.log('soucrce',sources);

      return tilelive.load(file, function(err, source) {
          console.log('err',err);
          console.log('source',source);

        if (!err) {
          sources.push({ uri: uri, source: source });
          console.log('sourcesloaded', sources );
        }
        return next(null, sources);
      })
    }, function(err, sources) {
      if (sources.length === 0) {
        return callback(new Error("Did not find any valid sources"));
      }

      return async.map(sources, function(src, next) {
        return src.source.getInfo(next);
      }, function(err, info) {
        self.sources = sources.map(function(source, i) {
          return {
            info: info[i],
            uri: source.uri
          };
        });

        return callback(null, self);
      });
    });
};


module.exports =  {
  fl_merge:Merge
};

