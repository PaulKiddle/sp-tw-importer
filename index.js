const main = require('./src');

const migrateRootId = process.argv[2];

if(!migrateRootId) {
	console.error(
		`Can't migrate vocabulary without root term ID.
		Supply term ID as script argument;
			node index.js [term-id]
		Find out the term from the Scratchpad.
		`
	);
	process.exit(1);
}

main({
	scratchpads: {
		user: 'scratchpads',
		pass: '',
		base: 'http://localhost'
	},
	taxonworks: {
		userId: 1,
		projectId: 1,
		base: 'http://localhost:3000'
	}
},
migrateRootId
);
