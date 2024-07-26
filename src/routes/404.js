module.exports = function handle404(req, res)
{
	res.status(404)

	if(req.accepts('html'))
		res.render('404')
	else if(req.accepts('json'))
		res.json({ error: 'Not found' })
	else
		res.type('txt').send('Not found')
}