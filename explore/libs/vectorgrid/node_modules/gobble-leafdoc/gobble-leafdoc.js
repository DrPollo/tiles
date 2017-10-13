
var LeafDoc = require('leafdoc');
var sander = require('sander');
var path = require('path');
var sandermatch = require('sandermatch');

function leafdoc ( inputdir, outputdir, options/*, callback */) {

	var doc = new LeafDoc(options),
	    files;

	if (!options.output) { options.output = 'leafdoc.html'; }
	
	if (options.files) {
		files = sandermatch.lsrMatch( inputdir, options.files );
	} else {
		files = sander.lsr( inputdir );
	}
	
	return files.then( function(filenames) {
		var logged = false;
		filenames.forEach(function(filename) {
			doc.addFile(path.join(inputdir, filename), path.extname(filename) !== '.leafdoc');
		})
		
		return sander.writeFile(outputdir, options.output, doc.outputStr() );
	} );

}

module.exports = leafdoc;
