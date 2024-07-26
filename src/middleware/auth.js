const User = require('../models/user')

module.exports = async (req, res, next) =>
{
	let user = await User.findById(req.session.userID)
	if(user == undefined)
		return res.redirect('/')
	next()
}