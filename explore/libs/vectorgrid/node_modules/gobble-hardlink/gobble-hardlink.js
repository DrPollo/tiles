var path = require("path");
var sander = require("sander");
var fs = require("fs");

module.exports = hardlink;

function hardlink(inputdir, outputdir, options) {

	return sander.lsr( inputdir ).then( function ( allFiles ) {
		var ops = [];

		for (var i in allFiles) {
			var filename = allFiles[i];

			ops.push(
				sander.realpath(inputdir, filename).then((function(file){
					return function(realpath) {
// 						console.log('Hard-linking from: ', path.join(inputdir, file), ', realpath: ', realpath, ' to: ', path.join(outputdir, file));
						return sander.link(realpath).to(outputdir, file);
					}
				})(filename))
			);
		}

		return Promise.all(ops);
	});
}
