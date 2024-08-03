const express = require('express')
const Post = require('../models/post')
const Tag = require('../models/tag')
const User = require('../models/user')

const router = express.Router()
const auth = require('../middleware/auth')

const postMediaFilters = [
	// Images
	'.png',
	'.jpg',
	'.jpeg',
	'.webp',
	'.gif',

	// Video
	'.mp4',
	'.mpeg4',
	'.webm',
	'.ogg'
].join(', ')
console.log(`Media filters: ${postMediaFilters}`)

router.get('/', async (req, res) => res.render('posts/list', { user: req.session?.user }))

router.get('/new', auth, async (req, res) =>
	res.render('posts/new', { postMediaFilters, user: req.session?.user }))

router.get('/:id/edit', async (req, res, next) =>
{
	let post = await Post.findById(req.params.id)
	if(!post)
		return next()

	post.tagsNamed = []
	for(let i = 0; i < post.tags.length; i++)
	{
		let tag = await Tag.findById(post.tags[i])
		if(tag)
			post.tagsNamed.push(tag.name)
	}

	res.render('posts/edit', { post, user: req.session?.user })
})

router.get('/:id', async (req, res, next) =>
{
	let post = await Post.findById(req.params.id)
	if(post)
	{
		let author = await User.findById(post.author)
		post.authorName = author.username

		post.tagsNamed = []
		for(let i = 0; i < post.tags.length; i++)
		{
			let tag = await Tag.findById(post.tags[i])
			if(tag)
				post.tagsNamed.push(tag.name)
		}

		post.isAuthor = post.author == req.session?.userID

		res.render('posts/view', { post, user: req.session?.user })
	}
	else
		next()
})

module.exports = router