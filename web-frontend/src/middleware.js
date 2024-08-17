import { getSession, refreshSession } from "./scripts/Authenticate";

export async function onRequest({ locals, request, url }, next) {
	const shouldRefreshSession = url.search.toLowerCase().includes('?refreshsession');
	if(shouldRefreshSession)
	{
		locals.session = await refreshSession(request);
		console.log(`Refreshed session`, locals.session);
	}
	else
		locals.session = getSession();

	return next();
}