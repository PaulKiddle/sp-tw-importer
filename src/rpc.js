const http = require('http');

// Creates a proxy that maps function calls to the equivalent jsonrpc requests

const p = (...args) => {
	const exec = rpc(...args);

	return new Proxy({}, {
		get(t, method){
			return (...params) => exec(method, params)
		}
	});
}

const rpc = (url, headers={}) => (method, params) => new Promise((resolve, reject) => {
	const req = http.request(url, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			...headers
		}
	}, async res => {
		let str ='';
		for await(const d of res) {
			str+=d;
		}
		try {
			resolve(JSON.parse(str).result);
		} catch(e) {
			console.log('Found error')
			reject(e);
		}
	});

	const body = {
		method, params
	};

	req.end(JSON.stringify(body));
});

module.exports = p;
