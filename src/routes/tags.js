const express = require('express')
const Tag = require('../models/tag')
const auth = require('../middleware/auth')

const router = express.Router()

router.get('/', async (req, res) =>
{
	let tags = await Tag.find({})
	res.render('tags/list', { tags, user: req.session?.user })
})

router.get('/:name', async (req, res, next) =>
{
	let tag = await Tag.findOne({ name: req.params.name.toLowerCase() })
	if(tag)
		res.render('tags/view', { tag, user: req.session?.user })
	else
		next()
})

router.get('/:name/edit', auth, async (req, res, next) =>
{
	if(!req.session.user.moderator)
		return res.redirect(`/tags/${req.params.name}`)
		
	let tag = await Tag.findOne({ name: req.params.name.toLowerCase() })
	if(tag)
		res.render('tags/edit', { tag, user: req.session?.user })
	else
		next()
})

module.exports = router