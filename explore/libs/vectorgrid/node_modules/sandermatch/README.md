
# Sandermatch

Filesystem functions that return filenames matching a minimatch pattern


## What

`sandermatch` is a small javascript library that combines the Promise-based power of [`sander`](https://github.com/Rich-Harris/sander) with the regexp-matching power of [`minimatch`](https://github.com/isaacs/minimatch).


## How 

"Give me all the filenames of all PNG images in /tmp, recursively"

```js
var sandermatch = require('sandermatch');

sandermatch.lsrMatch('/tmp', '**/*.png').then(function(filenames){ console.log(filenames) });
```

The following functions are exported:

* `lsrMatch(...paths, patterns)`
* `lsrMatchSync(...paths, patterns)`
* `readdirMatch(...paths, patterns)`
* `readdirMatchSync(...paths, patterns)`

All of them have behaviour like their counterparts in [`sander`](https://github.com/Rich-Harris/sander), but the return value is not a Promise of an array with all files. Instead, it's a Promise of a Set with the filenames that match one of `patterns`.

The resulting Set is ordered by the order of `patterns`, for example:

```
sandermatch.lsrMatch('.', ['**/*.js', '**/*.png']).then( function (filenames){
	// filenames has all the *.js before any of the *.png files, e.g.
	// - foo.js
	// - bar.js
	// - lib/whatever/whatever.js
	// - logo.png
	// - lib/whatever/assets/whatever.png
} );
```

## Compatibility

`sandermatch` is coded in ES2016, and transpiles to ES5 **but** it assumes that the `Set` datatype exists. Since this is [implemented in node 0.12 onwards](http://kangax.github.io/compat-table/es6/#test-Set), it shouldn't be a problem.

Run `npm install` to transpile to ES5. ES5/ES2015 dependencies should be handled transparently via the `main`/`jsnext:main` properties of `package.json`.

In ES2015 packages:

```js
import { lsrMatch } from 'sandermatch';
lsrMatch(path, pattern).then(doStuff);
```

