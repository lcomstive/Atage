const express = require('express')
const User = require('../../models/user')
const bcrypt = require('bcrypt')

const router = express.Router()

router.post('/updatePassword', async (req, res) =>
{
	if(!req.session.user)
		return res.status(403).json({ error: 'Not logged in' })

	let user = await User.findById(req.session.userID)
	const { currentPassword, newPassword } = req.body

	bcrypt.compare(currentPassword, user.password, (err, same) =>
	{
		if(err)
		{
			console.log(err)
			return res.json({ error: err })
		}

		if(!same)
			return res.json({ error: 'Password is incorrect' })

		bcrypt.hash(newPassword, 10, async (err, encrypted) =>
		{
			if(err)
			{
				console.error(`Failed to encrypt password for '${username}'`, err)
				return res.json({ error: err })
			}
		
			user.password = encrypted
			await user.save()

			return res.json({ success: true })
		})
	})
})

router.post('/updateUsername', async (req, res) => {
	if(!req.session.user)
		return res.status(403).json({ error: 'Not logged in' })

	let user = await User.findById(req.session.userID)
	const { username } = req.body

	if(await User.exists({ username }))
		return res.json({ error: 'Username is taken' })

	user.username = username
	req.session.user.username = username
	await user.save()

	return res.json({ success: true })
})

module.exports = router