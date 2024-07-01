// TW5 'server' edition to MWS recipes
// license: MIT
"use strict";

// Options
const opts = {
    mws: {
	port: '8201',
	host: '127.0.0.1', // 0.0.0.0 = allow remote access
	dir: './public/mws'
    },
    appdir: './public/wikis',
    expdir: './public/json'
};


const fs = require('node:fs');
const path = require('node:path');

const readline = require('node:readline');
const { stdin: input, stdout: output } = require('node:process');
const rl = readline.createInterface({ input, output });

const bootmws = require('./twboot/mws/boot');
var $tw; // Assigned by bootMWS()

// Set terminal colours
const colour = {
	log: (txt='', fg=255, bg=0, efg=255, ebg=0) => output.write(
		`\x1b[38;5;${fg};48;5;${bg}m${txt}\n\x1b[38;5;${efg};48;5;${ebg}m`),

	txt: (txt='', fg=255, bg=0, efg=255, ebg=0) =>
		`\x1b[38;5;${fg};48;5;${bg}m${txt}\n\x1b[38;5;${efg};48;5;${ebg}m`,
}


colour.log('Options:',184)
console.dir(opts);
colour.log();

function askRebuildDb() {
    return new Promise((resolve) => {
	const sqlitePath = `${opts.mws.dir}/store/database.sqlite`;
	fs.access(sqlitePath, (err) => {
	    if (!err) { // database exists
		rl.question('Rebuild SQLite database from scratch? (y/n) ', ans => {
		    if (ans[0] && ans[0].toUpperCase() === 'Y') {
			try {
			    fs.unlinkSync(sqlitePath);
			} catch(err) { throw(err) }
			colour.log(`Successfully deleted ${sqlitePath}`,183);
			colour.log(`TiddlyWiki will create a new database`,184);
		    } else {
			colour.log(`TiddlyWiki will use existing database`,184);
		    }
		    colour.log(`${sqlitePath}\n`,184);
		    resolve();
		})
	    } else {
		colour.log(`TiddlyWiki will create the database\n${sqlitePath}\n`,184);
		resolve();
	    }
	})
    })
}

// Just loop on this question - Never resolves! ctrl-c twice to exit
function askExportDb() {
    return new Promise((resolve) => {
	colour.log(`\nExport will create/overwrite existing JSON files in directory ${opts.expdir}`,183);
	rl.question(`Export all current SQLite database recipes as JSON (y/n) `, ans => {
	    if (ans[0] && ans[0].toUpperCase() === 'Y') {
		exportRecipes();
		colour.log(`Recipes exported to directory ${opts.expdir}`,183);
	    } else {
		colour.log(`Recipes not exported to ${opts.expdir}`,9);
	    }
	    askExportDb();
	})
    })
}

// Never resolves! ctrl-c twice to exit
function askLoadServerEditions() {
    return new Promise((resolve) => {
	rl.question(`\nLoad server editions from ${opts.appdir} (y/n) `, ans => {
	    if (ans[0] && ans[0].toUpperCase() === 'Y') {
		loadMwsDb();
		colour.log(`Server edition wikis loaded to database`,184);
	    } else {
		colour.log(`Server edition wikis NOT loaded to database`,9);
	    }
	    resolve();
	})
    })
}

function bootMWS() {
    colour.log('Startup TiddlyWiki MWS ...',112);
    const { $twmws, mwsDir } = bootmws.tiddlywiki(opts.mws.dir);
    $tw = $twmws;
}

function loadLocalPlugins(editionName, options) {
    ['plugins','theme','language'].forEach(pluginType => {
	if (fs.existsSync(`${opts.appdir}/${editionName}/${pluginType}`)) {
	    const pluginFolder = `${opts.appdir}/${editionName}/${pluginType}`;
	    var pluginsPublishers = fs
		.readdirSync(pluginFolder, { withFileTypes: true })
		.filter(dirent => dirent.isDirectory())
		.map(dirent => dirent.name);

	    pluginsPublishers.forEach(publisher => {
		colour.log(`Copying ${pluginType} '${publisher}' to MWS bag '${publisher}'`,184);
		$tw.mws.store.createBag(publisher, `${publisher} plugin`);
		//$tw.mws.store.createRecipe(editionName, [editionName,publisher], `From server edition ${editionName}`);
		var tiddlersFromPath = $tw.loadTiddlersFromPath(`${opts.appdir}/${editionName}/${pluginType}/${publisher}`);
		// Save the tiddlers
		for(const tiddlersFromFile of tiddlersFromPath) {
		    for(const tiddler of tiddlersFromFile.tiddlers) {
			    $tw.mws.store.saveBagTiddler(tiddler,publisher,null);
		    }
		}
		options.bagNames.push(publisher);
	    })
	}
    })
    return options;
}

function loadMwsDb() {
    // List of server edition wiki directories
    function editionNames() {
	const editionFolder = `${opts.appdir}`;
	return fs
	    .readdirSync(editionFolder, { withFileTypes: true })
	    .filter(dirent => dirent.isDirectory())
	    .map(dirent => dirent.name);
    }
    // Copy editions
    function copyEdition(options) {
	colour.log(`Copying server edition '${opts.appdir}/${options.recipeName}' to MWS recipe '${options.recipeName}'`,184);
	$tw.mws.store.createBag(options.recipeName, options.bagDescription);
	$tw.mws.store.createRecipe(options.recipeName, options.bagNames, options.recipeDescription);
	var tiddlersFromPath = $tw.loadTiddlersFromPath(options.tiddlersPath);
	// Save the tiddlers
	for (const tiddlersFromFile of tiddlersFromPath) {
	    for (const tiddler of tiddlersFromFile.tiddlers) {
		    $tw.mws.store.saveBagTiddler(tiddler,options.recipeName,null);
	    }
	}
	//$tw.mws.store.saveTiddlersFromPath(path.resolve($tw.boot.corePath, $tw.config.editionsPath, options.tiddlersPath), options.bagName);
	// Enable SSE
	$tw.mws.store.saveBagTiddler(
	    { title: '$:/config/multiwikiclient/use-server-sent-events', text: 'yes' }, options.recipeName
	);
    }
    // Load editions into database.sqlite
    editionNames().forEach((editionName) => {
	var options = {
	    bagNames: [],
	    bagDescription: `From server edition ${editionName}`,
	    recipeName: editionName,
	    recipeDescription: `From server edition ${editionName}`,
	    tiddlersPath: `${opts.appdir}/${editionName}/tiddlers`
	}
	options = loadLocalPlugins(editionName, options);
	options.bagNames.push(editionName);
	copyEdition(options)
    })
}

function commander(commands) {
    return new Promise((resolve) => {
	// TiddlyWki commander got an error?
	function checkForErrors(err) {
	    if (err) {
		try {
		    $tw.utils.error("Error: " + err);
		} catch (e) {}
	    }
	}

	// Create $twsync.Commander to do listen command
	const cmdr = {
	    execute: (cmds) => {
		const cc = new $tw.Commander(cmds, checkForErrors, $tw.wiki,
		    {output: process.stdout, error: process.stderr});
		cc.execute();
		resolve();
	    }
	}
	cmdr.execute(commands);
    })
}

// -----------------------
function exportRecipes() {
    var reqRecipes = $tw.mws.store.listRecipes();
    reqRecipes.forEach(reqRecipe => {
	const wiki = [];
	const recipeTiddlers = $tw.mws.store.getRecipeTiddlers(reqRecipe.recipe_name);
	if (recipeTiddlers) {
	    recipeTiddlers.forEach(tiddler => {
		wiki.push($tw.mws.store.getRecipeTiddler(tiddler.title, reqRecipe.recipe_name).tiddler);
	    })

	    fs.writeFileSync(`${opts.expdir}/${reqRecipe.recipe_name}.json`, JSON.stringify(wiki, null, 2));

	    colour.log(`Recipe ${reqRecipe.recipe_name} written to ${opts.expdir}/${reqRecipe.recipe_name}.json`,184);
	}
    })
}

// -----------------------


const commands = ['--mws-listen', `port=${opts.mws.port}`, `host=${opts.mws.host}`];

askRebuildDb()
.then(() => {
    bootMWS();
    colour.log(`Launch MWS web client ...`,184);
    commander(commands)
    .then(() => {
	setTimeout(() => {
	    askLoadServerEditions()
	    .then(() => {
		askExportDb();
	    })
	}, 200);
    })
})
