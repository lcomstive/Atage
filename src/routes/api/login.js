const express = require('express')
const User = require('../../models/user')
const bcrypt = require('bcrypt')

const router = express.Router()

router.post('/api/register', async (req, res) =>
{
	let username = req.body.username
	console.log(`Checking if '${username}' already exists`)
	let user = await User.findOne({ username: new RegExp(`^${username}$`, 'mi') })
	
	if(user != null)
	{
		res.json({ error: 'Username already exists' })
		return
	}

	bcrypt.hash(req.body.password, 10, async (err, encrypted) =>
	{
		if(err)
		{
			console.error(`Failed to encrypt password for '${username}'`, err)
			res.json({ error: err })
			return
		}

		user = await User.create({
			username,
			password: encrypted,
			createdDate: new Date().toISOString()
		})

		req.session.userID = user._id
		req.session.user = {
			id: user._id,
			username,
			moderator: false
		}

		res.json({ error: '', success: true })
	})
})

router.post('/api/login', async (req, res) =>
{
	const { username, password } = req.body
	
	if(username == '')
		return res.json({ error: 'Username empty' })

	let user = await User.findOne({ username: new RegExp(`^${username}$`, 'mi') })
	if(!user)
		return res.json({ error: 'User not found'})

	bcrypt.compare(password, user.password, (err, same) =>
	{
		if(err)
		{
			console.log(err)
			return res.json({ error: err })
		}
		else if(same)
		{
			req.session.userID = user._id
			req.session.user = {
				id: user._id,
				username: user.username,
				moderator: user.moderator,
				createdDate: user.createdDate
			}
			return res.json({ error: '', success: true })
		}
		else
			return res.json({ error: 'Invalid password' })
	})
})

router.get('/api/logout', (req, res) =>
{
	req.session?.destroy()
	res.json({ success: true })
})

router.get('/api/session', (req, res) =>
{
	if(!req.session?.user)
		return res.status(403).json({ error: 'Not logged in' })
	return res.json(req.session.user)
})

module.exports = router