import { APIAddress } from "../../scripts/API";

export const GET = async ({ cookies, url, request }) => {
	let pathname = url.pathname.substring('/api'.length);
	const apiPath = `${APIAddress}${pathname}${url.search}`;

	if(!request.headers)
		request.headers = {};
	request.headers.cookie = `connect.sid=${cookies.get('connect.sid')?.value}`;

	const response = await fetch(apiPath, request);
	return new Response(response.body);
}

export const POST = async ({ url, request }) => {
	let pathname = url.pathname.substring('/api'.length)
	const apiPath = `${APIAddress}${pathname}${url.search}`
	return fetch(apiPath, request);
}
