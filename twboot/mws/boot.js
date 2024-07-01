// Tiddlers to be loaded into embedded TiddlyWiki
const twTiddlers = require('./tiddlers.json');

const twPreloadTiddlers = twTiddlers;

module.exports = {
	// Boot TiddlyWiki module
	tiddlywiki: (_outDir = 'twmws') => {
		const me = {};
		me.outDir = _outDir;
		me.$tw = require('tiddlywiki').TiddlyWiki();
		me.$tw.preloadTiddlers = twPreloadTiddlers;
		me.$tw.boot.argv = [me.outDir]; // TW outDir path
		me.$tw.boot.boot(() => {});

		return { $twmws: me.$tw, mwsDir: me.outDir };
	}
}
