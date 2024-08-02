const express = require('express')
const Tag = require('../models/tag')

const router = express.Router()

router.get('/', async (req, res) =>
{
	let tags = await Tag.find({})
	res.render('tags/list', { tags, user: req.session?.user })
})

router.get('/new', async (req, res) => res.render('tags/edit', { user: req.session?.user}))

router.get('/:name', async (req, res, next) =>
{
	let tag = await Tag.findOne({ name: req.params.name.toLowerCase() })
	if(tag)
		res.render('tags/edit', { tag, user: req.session?.user })
	else
		next()
})

module.exports = router