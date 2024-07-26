const express = require('express')
const Tag = require('../models/tag')

const router = express.Router()

router.get('/', async (req, res) =>
{
	let tags = await Tag.find({})
	res.render('tagList', { tags })
})

router.get('/new', async (req, res) => res.render('tagEdit'))

router.get('/:name', async (req, res) =>
{
	let tag = await Tag.findOne({ name: req.params.name.toLowerCase() })
	if(tag)
		res.render('tagEdit', { tag })
	else
		res.render('404')
})

module.exports = router