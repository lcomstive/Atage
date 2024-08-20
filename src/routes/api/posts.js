const express = require('express')
const Post = require('../../models/post')
const Tag = require('../../models/tag')
const User = require('../../models/user')
const auth = require('../../middleware/auth')
const path = require('path')
const fs = require('fs')
const sharp = require('sharp')
const { ThumbnailExtension, VideoExtensions } = require('../../fileExtensions')

const ffmpeg = require('fluent-ffmpeg')
ffmpeg.setFfmpegPath(require('@ffmpeg-installer/ffmpeg').path)

const router = express.Router()

const PostMediaDirectory = path.join(__dirname, '../../../user-content')

addPostMeta = async (post, req) =>
{
	// Deep copy of results so we don't modify original
	post = JSON.parse(JSON.stringify(post))

	let author = await User.findById(post.author)
	post.authorName = author.username

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

	post.isAuthor = post.author == req.session?.userID

	let ext = post.filepath.substring(post.filepath.lastIndexOf('.'))
	post.isVideo = VideoExtensions.includes(ext)

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
	let postIDs = []

	for(let i = 0; i < req.files?.media.length ?? 0; i++)
	{
		let post = await Post.create({
			author: req.session.userID,
			public: posts[i].public ?? true,
			description: posts[i].description ?? ''
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

		let isVideo = VideoExtensions.includes(extension)

		await req.files.media[i].mv(mediaOutput)
			.then(() =>
			{
				// Generate thumbnail
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
							// Convert jpg thumbnail to webp
							sharp(`${mediaOutput}_thumbnail.jpg`)
								.resize(400 /* width, px */)
								.toFile(`${mediaOutput}${ThumbnailExtension}`)
								.then(() => fs.unlinkSync(`${mediaOutput}_thumbnail.jpg`)) // Delete temp thumbnail
								.catch(err => console.error(`Failed to generate thumbnail for '${mediaOutput}'`, err))
						})
						.run()
				}
				else
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
	console.log(JSON.stringify(req.body))
	for(let i = 0; i < req.body.posts?.length; i++)
	{
		console.log(`Updating post: ${JSON.stringify(req.body.posts[i])}`)
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

router.delete('/:id', auth, async (req, res) =>
{
	let post = await Post.findById(req.params.id)
	if(post.author != req.session?.userID)
		return res.status(403).send({ error: 'Not authorised '})
	
	let tags = [...post.tags] // Shallow copy

	if(fs.existsSync(`${PostMediaDirectory}/${post.filepath}`))
		fs.unlinkSync(`${PostMediaDirectory}/${post.filepath}`)
	if(fs.existsSync(`${PostMediaDirectory}/${post.filepath}${ThumbnailExtension}`))
		fs.unlinkSync(`${PostMediaDirectory}/${post.filepath}${ThumbnailExtension}`)

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

	if(tags.length > 0)
		query.$and = [{ tags: { $all: tags } }]

	// Pagination //
	const pageCount = req.query.count ?? process.env.DEFAULT_API_POST_COUNT ?? 50
	const pageIndex = req.query.page ?? 0
	const pagination = {
		limit: pageCount,
		skip: pageIndex * pageCount
	}
		
	// Get Posts //
	let posts = await Post.find(query, null, pagination);
	for(let i = 0; i < posts.length; i++)
		posts[i] = await addPostMeta(posts[i], req)

	return res.json(posts)
})

module.exports = {
	Router: router,

	PostMediaDirectory
}