const express = require('express')
const User = require('../models/user.js')
const Post = require('../models/post.js')
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

router.post('/updateUsername', async (req, res) =>
{
	if(!req.session.user)
		return res.status(403).json({ error: 'Not logged in' })

	let user = await User.findById(req.session.userID)
	const { username } = req.body

	if(await User.exists({ username: new RegExp(`^${username}$`, 'mi') }))
		return res.json({ error: 'Username is taken' })

	user.username = username
	req.session.user.username = username
	await user.save()

	return res.json({ success: true })
})

router.get('/:username/posts', async (req, res) =>
{
	let user = await User.findOne({ username: new RegExp(`^${req.params.username}$`, 'mi') })
	if(!user)
		return res.status(404).json({ error: 'User not found' })

	let query = {
		$and: [
			{ public: true },
			{ author: user._id }
		]
	}

	// If logged in as `username` then get all posts
	if(user._id == req.session?.userID)
		query = { author: user._id }

	let posts = await Post.find(query)
	return posts ? res.json(posts) : res.status(500).json({ error: 'Could not find posts for this user' })
})

router.get('/:username', async (req, res) =>
{
	let user = await User.findOne({ username: new RegExp(`^${req.params.username}$`, 'mi') })
	return user ? res.json(user) : res.status(404).json({ error: 'User not found' });
})

module.exports = router