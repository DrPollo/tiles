
var sander = require( 'sander' );


// Synchronous helper function - given an array of filenames, run the minimatch
// patterns.
function _filterPattern(filenames, patterns) {
	
	var minimatch = require( 'minimatch' ),
	    matching = new Set();
	
	if ( !Array.isArray(patterns) ) {
		patterns = [ patterns ];
	}
		
	for (var pattern of patterns) {
		for (var filename of filenames) {
			if (minimatch(filename, pattern)) {
				matching.add(filename);
			}
		}
	}
	
	return matching;
}



// @function lsr(...paths, patterns): Promise
// Returns a promise of an Set of filenames: the result of doing a recursive
// file listing on the paths (like the 'lsr' function of sander.js), then 
// filtered by the minimatch patterns.
// The `patterns` argument is a minimatch expression (which can be a string or
// an array of minimatch expressions).
// As the result is a Set, a filename will appear at most once, and filenames
// will be ordered, the ones matching the first pattern first.
export function lsrMatch() {	// Apparently babelJS chokes on `(...paths, patterns)`
	var patterns = arguments[arguments.length-1];
	var paths = Array.prototype.slice.call(arguments, 0, arguments.length-1);
	return sander.lsr.apply( this, paths ).then( allFiles => {
		return _filterPattern(allFiles, patterns);
	});
};

// @function lsrMatchSync(...paths, patterns): Promise
// like `lsrMatch`, but using the 'lsrSync' function of sander.js instead.
export function lsrMatchSync() {	// Apparently babelJS chokes on `(...paths, patterns)`
	var patterns = arguments[arguments.length-1];
	var paths = Array.prototype.slice.call(arguments, 0, arguments.length-1);
	return sander.lsrSync.apply( this, paths ).then( allFiles => {
		return _filterPattern(allFiles, patterns);
	});
};

// @function readdirMatch(...paths, patterns): Promise
// like `lsrMatch`, but using the 'readdir' function of sander.js instead.
export function readdirMatch() {	// Apparently babelJS chokes on `(...paths, patterns)`
	var patterns = arguments[arguments.length-1];
	var paths = Array.prototype.slice.call(arguments, 0, arguments.length-1);
	return sander.readdir.apply( this, paths ).then( allFiles => {
		return _filterPattern(allFiles, patterns);
	});
};

// @function readdirMatchSync(...paths, patterns): Promise
// like `lsrMatch`, but using the 'readdirSync' function of sander.js instead.
export function readdirMatchSync() {	// Apparently babelJS chokes on `(...paths, patterns)`
	var patterns = arguments[arguments.length-1];
	var paths = Array.prototype.slice.call(arguments, 0, arguments.length-1);
	return sander.readdirSync.apply( this, paths ).then( allFiles => {
		return _filterPattern(allFiles, patterns);
	});
};


