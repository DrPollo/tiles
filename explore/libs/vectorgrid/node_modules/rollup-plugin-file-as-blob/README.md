# rollup-plugin-file-as-blob

[Rollup](http://www.rollupjs.org) plugin to import any (binary) file as a [`blob:` URLs](http://caniuse.com/#search=Blob%20URLs).

## Installation

```bash
yarn add --dev rollup-plugin-file-as-blob
```
or
```bash
npm install --save-dev rollup-plugin-file-as-blob
```


## Usage

```js
// In rollup.config.js
import fileAsBlob from 'rollup-plugin-file-as-blob';

export default {
	entry: 'src/index.js',
	dest: 'dist/my-lib.js',
	plugins: [
		fileAsBlob()
	]
};
```

You can now refer to the content of those files as blob URLs, like so:

```js
import logo from './rollup.png';

var img = new Image();
img.src = logo;
document.body.appendChild( img );
```

In that example, `logo` is just a string like `blob:http%3A//localhost%3A8080/12345678-1234-1234-1234567890abcdef0`,
but under the hood it represents the contents of the `rollup.png` image.

Binary data is encoded using base64, which means they will be 33% larger than the
original size on disk. Thus, it is advised to not use this plugin to pack large binary
files (such as large images).

Using [`blob:` URLs](http://caniuse.com/#search=Blob%20URLs) means that the browser
(or the JS engine) will decode the data just once, instead of every time the data
is used. The alternative technique of using [`data:` URIs](http://caniuse.com/#feat=datauri)
means that the data is decoded every time it is used.

The downside is that the `blob:` URL technique does not work on IE9 or older, nor
on Node.js environments. The plugin includes a fallback to use `data:` URLs in this
case.

You can use the `include` and `exclude` options as in [most rollup plugins](https://github.com/rollup/rollup/wiki/Plugins#conventions), e.g.:

```js
// In rollup.config.js
import fileAsBlob from 'rollup-plugin-file-as-blob';

export default {
	entry: 'src/index.js',
	dest: 'dist/my-lib.js',
	plugins: [
		fileAsBlob({
			include: '**/**.png',
		})
	]
};
```

You can also use this rollup plugin to create `blob:` URLs to use with
web workers. Just make sure that the `*.js` file you want to use in your web
worker matches the `include` option, and that the order of transforms of that
file is important.

```js
import workerCode from './my-worker-code.js';

var myWorker = new Worker(workerCode);  // Again, workerCode is a blob: url, representing the .js file
```



## License

"THE BEER-WARE LICENSE":
<ivan@sanchezortega.es> wrote this file. As long as you retain this notice you
can do whatever you want with this stuff. If we meet some day, and you think
this stuff is worth it, you can buy me a beer in return.
