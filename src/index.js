const rpc= require('./rpc');
const fsStore = require('./fs-store');

const base64encode = data => Buffer.from(data).toString('base64');

function main({scratchpads, taxonworks}, treeRootId) {
	const {user, pass, base} = scratchpads;
	const auth = base64encode(user + ':' + pass);

	const sp = rpc(base + '/rpc', { 'authorization': 'Basic ' + auth  });
	const tw = rpc(taxonworks.base + '/api/v1/rpc', { 'x-user': taxonworks.userId, 'x-project': taxonworks.projectId });

	// Assume root taxon id is the same as the project ID
	const taxonworksRootTaxonId = taxonworks.projectId;

	async function migrateAuthor(id){
		const author = await sp.getAuthor(id);
		const newId = (await tw.createPerson(author)).id;
		return map.person[id] = newId;
	}

	async function createNamedAuthors(name){
		name = name.replace(/^\(|((,\s*|\s*\()[0-9]{4})?\)?$/g,'');
		const names = name.split(/\s+(?:&|and)\s+/);
		for(const [ix, name] of Object.entries(names)){
			names[ix] = map.authorName[name] || (map.authorName[name] = (await tw.createPerson({
				lastName: name
			})).id)
		}
		return names;
	}

	async function migrateSource(id) {
		if(map.source[id]) {
			return map.source[id];
		}

		const source = await sp.getSource(id);

		if(source.contributors) {
			for(const [ix, person] of Object.entries(source.contributors)) {
				source.contributors[ix] = map.person[person] || await migrateAuthor(person);
			}
		}

		if(source.year == '0') {
			const m = source.title.match(/[12][0-9]{3}/);
			source.year = m && m[0];
		}

		console.log(source);

		const newSource = await tw.createSource(source);

		console.log(newSource);

		return map.source[id] = newSource.id;
	};

	//sp.getTaxonRaw(97750).then(log);
	//sp.getSynonyms(105326).then(log);
	//sp.getParents(99238).then(log);

	//105326
	async function migrateSynonyms(oid) {
		console.log('Get migrated taxon id for', oid);
		const objectId = await migrateTaxon(oid);
		console.log('Got it', objectId);
		const taxa = await sp.getSynonyms(oid);
		for(const taxon of taxa) {
			const tid = taxon.tid;
			const synid = oid+'/'+tid;
			if(map.synonym[synid]) {
				console.log('Done', synid);
				continue;
			}
			console.log('Migrate synonym', synid);
			const reason = taxon.field_unacceptability_reason.und[0].value;
			const subjectId = await migrateTaxon(tid, true);
			console.log('Create synonym', reason);
			const r = await tw.createSynonym({
				subjectId,
				objectId,
				reason
			});

			map.synonym[synid] = r.id;

			console.log(r);
		}
	};

	async function createTaxon(taxon) {
		try {
			const id = (await tw.createTaxon(taxon)).id;

			console.log('Created', id);
			return id;
		} catch(e) {
			console.log('Failed to create taxon', taxon);
			throw e;
		}
	}


	async function migrateTaxon(id){
		if(map.taxon[id]) {
			return map.taxon[id];
		}
		const taxon = await sp.getTaxon(id)
		if(taxon.authors) {
			taxon.authors = await createNamedAuthors(taxon.authors);
		} else {
			delete taxon.authors;
		}
		taxon.source = await migrateSource(taxon.source);
		const parentId = await sp.getParent(taxon.id);
		const parent = await sp.getTaxon(parentId);
		const isSynonym = taxon.type !== 'accepted';
		console.log(taxon.rank, parent.rank, taxon.rank === parent.rank);
		console.log('parent', parent, 'synonym', isSynonym);
		const gp = isSynonym && await sp.getParent(parentId);
		console.log(gp, gp && gp.rank);
		taxon.parentId = await migrateTaxon(gp ? gp : parentId);
		taxon.name = taxon.name.split(' ').pop();
		const t = map.taxon[id] = await createTaxon(taxon);
		console.log('Taxon migrated to', t);
		console.log('Migrate synonyms');
		await migrateSynonyms(id);
		console.log('Migrate synonyms done');
		return t;
	}

	async function crawlTree(tid){
		const children = await sp.getChildren(tid);

		if(!children.length) {
			console.log(tid, 'has no children - migrate');

			const newId = await migrateTaxon(tid);
			console.log(tid, 'migrated to ', newId);
		}

		for(const child of children) {
			await crawlTree(child.tid);
		}
	}

	console.log('Beginning migration for taxonomy tree with root node ', treeRootId);
	console.log('Leaf nodes will be migrated first.')
	crawlTree(treeRootId);

	/*sp.getTaxon(99111).then(async taxon => {
		taxon.authors = await createNamedAuthors(taxon.authors);
		taxon.source = (await migrateSource(taxon.source)).id;
		taxon.parentId = map.taxon[await sp.getParent(taxon.id)];
		console.log('taxon', taxon);
		console.log(await tw.createTaxon(taxon));
	});*/

	const mpd = 'mappings/';

	const map = {
		person: fsStore(mpd + 'person.json', {

		}),
		authorName: fsStore(mpd + 'authorName.json', {}),
		taxon: fsStore(mpd + 'taxon.json', {
			[null]: taxonworksRootTaxonId
		}),
		synonym: fsStore(mpd + 'synonym.json', {

		}),
		source: fsStore(mpd + 'source.json', {})
	};

	//["97750","98122","98661","99111","105326"].reduce((p, tid) => p.then(()=>migrateSynonyms(tid)), Promise.resolve());
	//migrateTaxon(99203);
	//sp.getTaxonRaw(99871).then(log);
	//sp.getParent(97750).then(log);
	//sp.getParent(105326).then(log);

	//migrateAuthor(152);

	// sp(
	// 	method, params
	// // 	'getAuthor', ['773']
	// // ).then(author => {
	// // 	console.log('Got author')
	// // 	return tw('createPerson', [author])
	// // }
	// ).then(log);


	// id that maps well to both systems



	// tw.upsertTerm(sp.getTerm(id))

	/*
	Data types

	- Term
	- Biblio
	- SPM
	- Location
	- ?


	Taxon: need to get the right terms from sp:

	TaxonName.create!(
		parent_id: 2,
		name: 'Alicarbon',
		type: 'Protonym',
		verbatim_author: 'Raf',
		rank_class: 'NomenclaturalRank::Iczn::GenusGroup::Genus',
		source: s
	)


	*/
}

module.exports = main;
