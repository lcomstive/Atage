import { APIAddress } from './API';

let session = null;

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

export function getSession() { return session; }

export async function refreshSession(req) { 
	const response = await fetchAuth(`${APIAddress}/session`, req)
							.catch(err => console.error(err));

	const status = response.status;
	if(status != 200)
	{
		session = null;
		return null;
	}

	session = await response.json();
	return session;
}