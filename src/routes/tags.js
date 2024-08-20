const express = require('express')
const Tag = require('../models/tag.js')

const router = express.Router()

router.get('/', async (req, res) =>
{
	let search = (req.query.search ?? '')
					.replaceAll('(', '\\(')
					.replaceAll(')', '\\)')

	let tags = []
	if(search != '')
		tags = await Tag.find({ $or: [
			{ name: { $regex: search, $options: 'i' } },
			{ aliases: { $regex: search } }
		]})
	else
		tags = await Tag.find({})
	return res.json(tags)
})

router.get('/:id', async (req, res) =>
{
	try
	{
		let tag = await Tag.findById(req.params.id)
		if(tag != null)
			return res.status(200).json(tag)
	}
	catch {}
	return res.status(404).json({ error: 'Tag does not exist' })
})

router.post('/:name', async (req, res) =>
{
	let name = req.params.name.toLowerCase()
	let tag = await Tag.findOne({ name })
						.catch(err => console.error(`Failed to find tag '${name}'`, err))
	
	if(!tag)
	{
		// Tag doesn't exist, create it
		tag = await Tag.create({ name })
						.catch(err => console.error(`Failed to create tag '${name}'`, err))
	}
	else
		tag.name = req.body.name

	// TODO: Update tag properties (e.g. aliases, parent)

	tag.save()

	res.status(200).json({})
})

router.post('/:name/delete', async (req, res) =>
{
	let name = req.params.name.toLowerCase()
	if(!req.body.confirm)
		return

	await Tag.deleteOne({ name })
	res.status(200).json({})
})

module.exports = router