import { readFileSync, realpathSync } from 'fs';
import { Magic, MAGIC_MIME_TYPE, MAGIC_MIME_ENCODING } from 'mmmagic';
import { createFilter } from 'rollup-pluginutils';

export default function fileAsBlob ( options = {} ) {
	const filter = createFilter( options.include, options.exclude );
	const magic = new Magic(MAGIC_MIME_TYPE | MAGIC_MIME_ENCODING);

	return {
		name: 'file-as-blob',

		intro: function () {
			return `function __$strToBlobUri(str, mime, isBinary) {
				try {
					return window.URL.createObjectURL(
						new Blob([Uint8Array.from(
							str.split('').map(function(c) {return c.charCodeAt(0)})
						)], {type: mime})
					);
				} catch (e) {
					return "data:" + mime + (isBinary ? ";base64," : ",") + str;
				}
			}`.split('\n').map(Function.prototype.call, String.prototype.trim).join('');
		},

		load ( id ) {
			if ( !filter( id ) ) { return null; }

			id = realpathSync(id);

			return new Promise((res)=> {

				magic.detectFile(id, (err, mime)=>{

					const charset = mime.split('; charset=')[1];

					var readEncoding = 'base64';
					if (charset === 'utf-8') readEncoding = 'utf8';
					if (charset.indexOf('ascii') !== -1) readEncoding = 'ascii';

					let data = readFileSync( id, readEncoding );

					var code;
					if (readEncoding === 'base64') {
						code = `export default __$strToBlobUri(atob("${data}"), "${mime}", true);`;
					} else {
						// Unfortunately buble+rollup will create code that chokes
						// with newlines/quotes when the contents are read from
						// a file
						data = data.replace(/\n/g, '\\n')
						           .replace(/\r/g, '\\r')
						           .replace(/"/g, '\\"')
						           .replace(/sourceMappingURL/g, 'sourceMap" + "pingURL');
						code = "export default __$strToBlobUri(\"" + data + "\", \"" + mime + "\", false);";
					}

					return res({ code: code, map: { mappings: '' } });
				});
			});
		}
	};
}
