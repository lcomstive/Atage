module.exports =
{
	login: async (req, res) => {
		if(req.session?.userID ?? false)
			res.redirect('/')
		else
			res.render('login/login')
	},
	register: async (req, res) => {
		if(req.session?.userID ?? false)
			res.redirect('/')
		else
			res.render('login/register')
	},
	logout: async (req, res) => {
		req.session?.destroy()
		req.session = null
		res.redirect('/')
	}
}
