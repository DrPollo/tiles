# gobble-leafdoc

Gobble plugin to generate Leafdoc (🍂doc) documentation.

## Installation

I assume you already know the basics of [Gobble](https://github.com/gobblejs/gobble).

```bash
npm i -D gobble-leafdoc
```

And I also assume that you also have some code with [Leafdoc](https://github.com/IvanSanchez/Leafdoc)-style
documentation on it.

## Usage

In your `gobblefile`, run the `leafdoc` gobble transform with a `output` option, like so:

```javascript
var gobble = require( 'gobble' );
module.exports = gobble( 'src' ).transform( 'leafdoc', {
  output: 'documentation.html'
});
```

Any Leafdoc-specific options can be specified in the transform options, for example:

```javascript
module.exports = gobble( 'src' ).transform( 'leafdoc', {
  output: 'documentation.html',
  templateDir: 'assets/custom-leafdoc-templates',
  leadingCharacter: '@'
});
```

Additionally, the `files` option can be used to order and filter files to be 
parsed with Leafdoc. This is useful when creating subsets of documentation, or
adding some leading/trailing content. The `files` option is a [`minimatch`](https://github.com/isaacs/minimatch)
pattern, or an array of minimatch patterns.

```javascript
module.exports = gobble( 'src' ).transform( 'leafdoc', {
  output: 'documentation.html',
  files: [
     'first-very-important-thing.leafdoc',
     '**/*.js',
     'credits.leafdoc'
  ]
});
```


## License

```
"THE BEER-WARE LICENSE":
<ivan@sanchezortega.es> wrote this file. As long as you retain this notice you
can do whatever you want with this stuff. If we meet some day, and you think
this stuff is worth it, you can buy me a beer in return.
```
