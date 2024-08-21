const express = require('express')
const Post = require('../models/post')
const Tag = require('../models/tag')
const User = require('../models/user')
const auth = require('../middleware/auth')
const path = require('path')
const fs = require('fs')
const sharp = require('sharp')
const { ThumbnailExtension, VideoExtensions, translateSortQuery } = require('../utils')

const ffmpeg = require('fluent-ffmpeg')
ffmpeg.setFfmpegPath(require('@ffmpeg-installer/ffmpeg').path)

const router = express.Router()

const PostMediaDirectory = path.join(__dirname, '../../user-content')

addPostMeta = async (post, req, desiredFields = null) =>
{
	// Deep copy of results so we don't modify original
	post = JSON.parse(JSON.stringify(post))

	if(post.author && (desiredFields?.includes('authorname') ?? true))
	{
		let author = await User.findById(post.author)
		post.authorName = author?.username
	}

	if(post.tags?.length > 0 && (desiredFields?.includes('tagdata') ?? true))
	{
		post.tagData = []
		for(let i = 0; i < post.tags.length; i++)
			{
				let tag = await Tag.findById(post.tags[i])
				if(tag)
					post.tagData.push({
				name: tag.name,
				postCount: tag.postCount
			})
		}
	}

	if(post.author && (desiredFields?.includes('isauthor') ?? true))
		post.isAuthor = post.author == req.session?.userID

	if(post.filepath && (desiredFields?.includes('isvideo') ?? true))
	{
		let ext = post.filepath.substring(post.filepath.lastIndexOf('.'))
		post.isVideo = VideoExtensions.includes(ext)
	}

	return post
}

updateTagPostCount = async (tagID) =>
{
	let tag = await Tag.findById(tagID)
	tag.postCount = await Post.countDocuments({ tags: tagID })

	if(tag.postCount > 0)
		await tag.save()
	else
		await Tag.findByIdAndDelete(tagID)
}

const fieldsDependencies =
[
	{ field: 'authorname', dependsOn: 'author' },
	{ field: 'tagdata', dependsOn: 'tags' },
	{ field: 'isauthor', dependsOn: 'author' },
	{ field: 'isvideo', dependsOn: 'filepath' }
]
getDesiredFields = (fields) =>
{
	fields = fields?.filter(x => x && x != '')
					.map(x => x.toLowerCase().trim())
	if(!fields || fields?.length == 0) return null
	
	let checkingFields = JSON.parse(JSON.stringify(fields)) // Copy object
	for(let i = 0; i < checkingFields?.length; i++)
	{
		let dependency = fieldsDependencies.find(x => x.field == checkingFields[i])
		if(dependency)
			fields.push(dependency.dependsOn)
	}

	return fields
}

// Create post
function generateThumbnail(mediaOutput, extension) {
	let isVideo = VideoExtensions.includes(extension)
	
	if(isVideo)
	{
		// Generate thumbnail from first second of video.
		// Generates a .jpg, used temporarily before converting to .webp using sharp
		ffmpeg({ source: mediaOutput })
			.seekInput(1)
			.frames(1)
			.output(`${mediaOutput}_thumbnail.jpg`)
			.on('error', err => console.log(`Failed to generate thumbnail for '${mediaOutput}`, err))
			.on('end', () =>
			{
				let fileContents = fs.readFileSync(`${mediaOutput}_thumbnail.jpg`)
				// Convert jpg thumbnail to webp
				sharp(fileContents)
					.resize(400 /* width, px */)
					.toFile(`${mediaOutput}${ThumbnailExtension}`)
					.then(() => fs.unlinkSync(`${mediaOutput}_thumbnail.jpg`)) // Delete temp thumbnail
					.catch(err => console.error(`Failed to generate thumbnail for '${mediaOutput}'`, err))
			})
			.run()
	}
	else
	{
		let fileContents = fs.readFileSync(mediaOutput)
		sharp(fileContents)
			.resize(400 /* width, px */)
			.toFile(`${mediaOutput}${ThumbnailExtension}`)
			.catch(err => console.error(`Failed to generate thumbnail for '${mediaOutput}'`, err))
	}
}

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
	let postIDs = []

	for(let i = 0; i < req.files?.media.length ?? 0; i++)
	{
		let post = await Post.create({
			author: req.session.userID,
			public: posts[i].public ?? true,
			description: posts[i].description ?? '',
			date: new Date().toISOString()
		})
		postIDs.push(post._id)

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
			.then(() => generateThumbnail(mediaOutput, extension))
			.catch(err => console.error(`Failed to create file '${mediaOutput}'`, err))
		
		await post.save()
	}

	for(let i = 0; i < allTags.length; i++)
		updateTagPostCount(allTags[i])
		
	res.json({ success: true, postIDs })
})

// Update post
const updatePost = async (id, data) =>
{
	let post = await Post.findById(id)
	if(!post)
	{
		console.error(`Tried to update post '${id}', but ID not found`)
		return
	}

	post.public = data.public ?? true
	post.description = data.description ?? ''

	let allTags = post.tags

	post.tags = []
	for(let i = 0; i < data.tags?.length; i++)
	{
		let tag = await Tag.findOne({ name: data.tags[i].toLowerCase() })
		if(!tag)
			tag = await Tag.create({ name: data.tags[i].toLowerCase() })

		post.tags.push(tag._id)

		if(!allTags.includes(tag._id))
			allTags.push(tag._id)
	}

	await post.save()

	for(let i = 0; i < allTags.length; i++)
		updateTagPostCount(allTags[i])
}

router.post('/:id/update', async (req, res) =>
{
	await updatePost(req.params.id, req.body)
	res.send({ success: true })
})

router.post('/updateMany', async (req, res) => {
	for(let i = 0; i < req.body.posts?.length; i++)
	{
		try { await updatePost(req.body.posts[i].id, req.body.posts[i]) }
		catch(err) { console.error(err) }
	}
	res.send({ success: true })
})

// Get post
router.get('/:id', async (req, res) =>
{
    try 
    {
	    let post = await Post.findById(req.params.id)
    	if(!post)
	    	return res.status(404).json({ error: 'Post not found' })

	    if(!post.public && post.author != req.session?.userID)
		    return res.status(403).send({ error: 'Not authorised' })

    	post = await addPostMeta(post, req)
	    return res.status(200).json(post)
    }
    catch(err) { return res.status(500).json({ error: err.message }) }
})

function tryDeleteFile(path, maxAttempts = 4) {
	if(maxAttempts <= 0 || !fs.existsSync(path))
		return;

	fs.unlink(path, err => {
		if(!err) return; // Success

		maxAttempts -= 1
		console.log(`Error deleting '${path}' - ${err} [Attempts left: ${maxAttempts}]`)
		setTimeout(() => tryDeleteFile(path, maxAttempts), 5000)
	})
}

router.delete('/:id', auth, async (req, res) =>
{
	let post = await Post.findById(req.params.id)
	if(!post)
		return res.status(404).send({ error: 'Post not found' })
	if(post.author != req.session?.userID)
		return res.status(403).send({ error: 'Not authorised '})
	
	let tags = [...post.tags] // Shallow copy

	tryDeleteFile(`${PostMediaDirectory}/${post.filepath}`)
	tryDeleteFile(`${PostMediaDirectory}/${post.filepath}${ThumbnailExtension}`)

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
	// Tags //
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

	// Query //
	let query = { $or: [
		{ public: true },
		{ author: req.session?.userID }
	]}
	let options = {}

	if(tags.length > 0)
		query.$and = [{ tags: { $all: tags } }]

	// Sorting //
	options.sort = translateSortQuery(req.query.sort ?? 'id')
	
	// Pagination //
	options.limit = req.query.count ?? process.env.DEFAULT_API_POST_COUNT ?? 20
	options.skip = (req.query.page ?? 0) * options.limit

	// Get Posts //
	let projection = getDesiredFields(req.query.fields?.split(','))
	let posts = await Post.find(query, projection, options)
							
	for(let i = 0; i < posts.length; i++)
		posts[i] = await addPostMeta(posts[i], req, projection)

	return res.json(posts)
})

module.exports = {
	Router: router,

	PostMediaDirectory
}