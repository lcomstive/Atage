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
	return fetch(url, options);
}

export async function getSession(req) {
	const response = await fetchAuth(`${import.meta.env.API_URL}/session`, req);

	const status = response.status;
	if(status != 200)
		return null;

	return await response.json();
}