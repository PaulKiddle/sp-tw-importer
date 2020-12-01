const fs = require('fs');

// Creates a proxy that reads from and writes to a json file on the filesystem

const tryRead = (file, defaultVal) => {
	try {
		return fs.readFileSync(file, 'utf8');
	} catch(e) {
		console.warn(e);
		return defaultVal;
	}
}

function store(location, defaultVal){
	return {
		load(){
			const val = tryRead(location);
			return val ? JSON.parse(val) : defaultVal;
		},
		save(value) {
			fs.writeFileSync(location, JSON.stringify(value))
		}
	}
}

module.exports = function pStore(location, defaultVal) {
	const t = store(location, defaultVal);
	let o = t.load();

	return new Proxy(t, {
		get(_, prop) {
			o = t.load();
			return o[prop];
		},
		set(_, prop, value) {
			o[prop] = value;
			t.save(o);
		}
	})
}
