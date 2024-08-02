const express = require('express')
const Post = require('../../models/post')
const Tag = require('../../models/tag')
const auth = require('../../middleware/auth')
const path = require('path')
const fs = require('fs')

const router = express.Router()

const PostMediaDirectory = path.join(__dirname, '../../../user-content')

// Create post
router.post('/new', auth, async (req, res) =>
{
	if(!fs.existsSync(PostMediaDirectory))
		fs.mkdirSync(PostMediaDirectory)
	if(!fs.existsSync(`${PostMediaDirectory}/${req.session.userID}/`))
		fs.mkdirSync(`${PostMediaDirectory}/${req.session.userID}`)

	let posts = JSON.parse(req.body.posts)
	for(let i = 0; i < req.files?.media.length ?? 0; i++)
	{
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
			let tag = await Tag.findOne({ $or: [
				{ name: tagRaw },
				{ aliases: { $in: tagRaw } }
			]})
			if(tag)
				post.tags.push(tag._id)
			else
				console.log(`Couldn't find tag '${tagRaw}'`)
		}

		// Post media
		let extension = req.files.media[i].name.substring(req.files.media[i].name.lastIndexOf('.'))
		post.filepath = `${req.session.userID}/${post._id}${extension}`
		let mediaOutput = `${PostMediaDirectory}/${post.filepath}`

		await req.files.media[i].mv(
			mediaOutput,
			err => 
			{
				if(err)
					console.error(`Failed to create file '${mediaOutput}'`, err)
			})

		post.save()
	}
		
	res.json({ success: true })
})

// Update post
/*
router.patch('/:id', async (req, res) =>
{
	
})
*/

// Get post
router.get('/:id', async (req, res) =>
{
	let post = await Post.findById(req.params.id)
	if(!post.public && post.author != req.session?.userID)
		return res.status(403).send({ error: 'Not authorised' })

	return res.status(200).json(post)
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
	return res.sendFile(`${PostMediaDirectory}/${post.filepath}`)
})

// Get posts
router.get('/', async (req, res) =>
{
	let tagsRaw = req.query.tags ?? null

	if(tagsRaw)
	{
		tagsRaw = decodeURI(tagsRaw).split(',')
		// console.log(`Getting posts with tags: ` + JSON.stringify(tagsRaw))
	}

	let tags = []
	for(let i = 0; i < tagsRaw?.length ?? 0; i++)
	{
		tagsRaw[i] = tagsRaw[i].toLowerCase()
		let tag = await Tag.findOne({ $or: [
			{ name: tagsRaw[i] },
			{ aliases: { $in: tagsRaw[i] } }
		]})
		if(tag)
			tags.push(tag._id)
	}
	// console.log(`Getting posts with tags: ` + JSON.stringify(tags))

	let posts = await Post.find(tags.length == 0 ? {} : { tags: { $all: tags }})
	return res.json(posts)
})

module.exports = router