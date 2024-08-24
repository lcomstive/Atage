import { Router } from 'express'
import Tag from '../models/tag.js'
import Post from '../models/post.js'
import { translateSortQuery } from '../utils.mjs'

export const router = Router()

export const NSFWTagName = 'explicit'
let NSFWTagID = null
export const getNSFWTagID = async () =>
{
	if(NSFWTagID != null)
		return NSFWTagID

	let tag = await Tag.findOne({ name: NSFWTagName })
						.catch(err => console.error(err))
	if(!tag)
	{
		tag = await Tag.create({ name: NSFWTagName, postCount: 0 })
		await tag.save()
		NSFWTagID = tag._id
	}

	NSFWTagID = tag._id
	return NSFWTagID
}

export const updateTagPostCount = async (tagID) =>
{
	let tag = await Tag.findById(tagID)
	if(!tag)
	{
		console.error(`Failed to find tag by ID ${tagID}`)
		return
	}
	tag.postCount = await Post.countDocuments({ tags: tagID })

	if(tag.postCount > 0 || tag._id.equals(NSFWTagID))
		await tag.save()
	else
		await Tag.findByIdAndDelete(tagID)
}

export const updateAllTagPostCounts = async () =>
{
	await getNSFWTagID() // Put NSFW tag ID into cache

	let tags = await Tag.find({})
	for(let i = 0; i < tags.length; i++)
		updateTagPostCount(tags[i])
}
setTimeout(async () => await updateAllTagPostCounts(), 100) // Run on startup

// Get tags
router.get('/', async (req, res) =>
{
	let search = (req.query.search ?? '')
					.replaceAll('(', '\\(')
					.replaceAll(')', '\\)')

	let options = {}
	if(req.query.count)
	{
		options.limit = req.query.count
		options.skip = (req.query.page ?? 0) * options.limit
	}

	options.sort = translateSortQuery(req.query.sort ?? 'id')

	let tags = []
	if(search != '')
		tags = await Tag.find({ $or: [
			{ name: { $regex: search, $options: 'i' } },
			{ aliases: { $regex: search } }
		]}, null, options)
	else
		tags = await Tag.find({}, null, options)
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
