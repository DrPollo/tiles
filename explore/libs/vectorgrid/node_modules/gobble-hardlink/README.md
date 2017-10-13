# gobble-hardlink

Gobble plugin to hard-link files.

[Hard links](https://en.wikipedia.org/wiki/Hard_link) are somewhat similar to
[symlinks](https://en.wikipedia.org/wiki/Symbolic_link), in the sense that both
operations make a link of a filename into another filename, which looks like
a copy, but without using storage space for the file again.

The benefit of symlinks is that one can what is a real file and what is a link.
With hard links, both the original file and the hardlink look exactly the same.

This makes hard links useful in situations where resolving file paths of symlinks
confuse the build process. Hard-linking a Gobble merge node will make that node
look like a set of real files, allowing to resolve relative paths within that
set of files.

## Installation

I assume you already know the basics of [Gobble](https://github.com/gobblejs/gobble).

```bash
npm i -D gobble-hardlink
```

## Usage

In your `gobblefile`, run the `hardlink` gobble transform, like so:

```javascript
var gobble = require( 'gobble' );

var files = gobble([gobble('src'), gobble('css')]);

var hardlinked = files.transform('hardlink');
```

This Gobble plugin takes no options.

## License

```
"THE BEER-WARE LICENSE":
<ivan@sanchezortega.es> wrote this file. As long as you retain this notice you
can do whatever you want with this stuff. If we meet some day, and you think
this stuff is worth it, you can buy me a beer in return.
```
