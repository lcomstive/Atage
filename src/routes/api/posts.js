const express = require('express')
const Post = require('../../models/post')
const Tag = require('../../models/tag')
const auth = require('../../middleware/auth')
const path = require('path')
const fs = require('fs')
const sharp = require('sharp')

const router = express.Router()

const ThumbnailExtension = '_thumbnail.webp'
const PostMediaDirectory = path.join(__dirname, '../../../user-content')

updateTagPostCount = async (tagID) =>
{
	let tag = await Tag.findById(tagID)
	tag.postCount = await Post.countDocuments({ tags: tagID })

	if(tag.postCount > 0)
		await tag.save()
	else
		await Tag.findByIdAndDelete(tagID)
}

// Create post
router.post('/new', auth, async (req, res) =>
{
	if(!fs.existsSync(PostMediaDirectory))
		fs.mkdirSync(PostMediaDirectory)
	if(!fs.existsSync(`${PostMediaDirectory}/${req.session.userID}/`))
		fs.mkdirSync(`${PostMediaDirectory}/${req.session.userID}`)

	let posts = JSON.parse(req.body.posts)

	// If single file upload, put into array
	if(req.files.media && !req.files.media.length)
		req.files.media = [req.files.media]

	let allTags = []

	for(let i = 0; i < req.files?.media.length ?? 0; i++)
	{
		console.log(req.files.media[i].name)

		let post = await Post.create({
			author: req.session.userID,
			public: posts[i].public ?? true,
			description: posts[i].description ?? ''
		})

		// Tags
		post.tags = []
		for(let t = 0; t < posts[i].tags?.length ?? 0; t++)
		{
			let tagRaw = posts[i].tags[t].toLowerCase()
			let tag = await Tag.findOne({ name: tagRaw })
			if(!tag)
				tag = await Tag.create({ name: tagRaw })

			post.tags.push(tag._id)
			allTags.push(tag._id)
		}

		// Post media
		let extension = req.files.media[i].name.substring(req.files.media[i].name.lastIndexOf('.'))
		post.filepath = `${req.session.userID}/${post._id}${extension}`
		let mediaOutput = `${PostMediaDirectory}/${post.filepath}`

		await req.files.media[i].mv(mediaOutput)
			.then(() =>
			{
				// Generate thumbnail
				sharp(mediaOutput)
					.resize(400 /* width, px */)
					.toFile(`${mediaOutput}${ThumbnailExtension}`)
					.catch(err => console.error(`Failed to generate thumbnail for '${mediaOutput}'`, err))
			})
			.catch(err => console.error(`Failed to create file '${mediaOutput}'`, err))
		
		await post.save()
	}

	for(let i = 0; i < allTags.length; i++)
		updateTagPostCount(allTags[i])
		
	res.json({ success: true })
})

// Update post
router.post('/:id/update', async (req, res) =>
{
	let post = await Post.findById(req.params.id)

	post.public = req.body.public ?? true
	post.description = req.body.description ?? ''

	let allTags = post.tags

	post.tags = []
	for(let i = 0; i < req.body.tags?.length; i++)
	{
		let tag = await Tag.findOne({ name: req.body.tags[i].toLowerCase() })
		if(!tag)
			tag = await Tag.create({ name: req.body.tags[i].toLowerCase() })

		post.tags.push(tag._id)

		if(!allTags.includes(tag._id))
			allTags.push(tag._id)
	}

	await post.save()

	for(let i = 0; i < allTags.length; i++)
		updateTagPostCount(allTags[i])

	res.send({ success: true })
})

// Get post
router.get('/:id', async (req, res) =>
{
	let post = await Post.findById(req.params.id)
	if(!post.public && post.author != req.session?.userID)
		return res.status(403).send({ error: 'Not authorised' })

	return res.status(200).json(post)
})

router.delete('/:id', auth, async (req, res) =>
{
	let post = await Post.findById(req.params.id)
	if(post.author != req.session?.userID)
		return res.status(403).send({ error: 'Not authorised '})
	
	let tags = [...post.tags] // Shallow copy

	await Post.findByIdAndDelete(req.params.id)

	for(let i = 0; i < tags.length; i++)
		updateTagPostCount(tags[i])

	res.send({ success: true })
})

// Get post image
router.get('/:id/img', async (req, res) => {
	let post = await Post.findById(req.params.id)
	if(!post.public && post.author != req.session?.userID)
		return res.status(403).send({ error: 'Not authorised' })
	return res.sendFile(`${PostMediaDirectory}/${post.filepath}`)
})

// Get post thumbnail
router.get('/:id/thumbnail', async (req, res) => {
	let post = await Post.findById(req.params.id)
	if(!post.public && post.author != req.session?.userID)
		return res.status(403).send({ error: 'Not authorised' })
	return res.sendFile(`${PostMediaDirectory}/${post.filepath}${ThumbnailExtension}`)
})

// Get posts
router.get('/', async (req, res) =>
{
	let tagsRaw = req.query.tags ?? null

	if(tagsRaw)
		tagsRaw = decodeURI(tagsRaw).split(',')

	let tags = []
	for(let i = 0; i < tagsRaw?.length ?? 0; i++)
	{
		tagsRaw[i] = tagsRaw[i].toLowerCase()
		let tag = await Tag.findOne({ name: tagsRaw[i] })
		if(tag)
			tags.push(tag._id)
	}

	let query = { $or: [
		{ public: true },
		{ author: req.session?.userID }
	]}

	if(tags.length > 0)
		query.$and = [{ tags: { $all: tags } }]

	let posts = await Post.find(query)
	return res.json(posts)
})

module.exports = router