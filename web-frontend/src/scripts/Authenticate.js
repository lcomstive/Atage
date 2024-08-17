import { APIAddress } from './API'

export async function getCookie(astroRequest) {
	return astroRequest.headers.get('cookie');
}

export async function fetchAuth(url, astroRequest, options = {}) {
	if(!options)
		options = {}

	options.credentials = 'include';
	if(!options.headers)
		options.headers = {}
	options.headers.cookie = astroRequest.headers.get('cookie');

	if(url.startsWith('/'))
		url = APIAddress + url;

	return fetch(url, options);
}

export async function getSession(req) {
	console.log(`API Addres: ${APIAddress}`);
	const response = await fetchAuth(`${APIAddress}/session`, req);

	const status = response.status;
	if(status != 200)
		return null;

	return await response.json();
}