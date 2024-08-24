import fs from 'fs'
import { Router } from 'express'
import Post from '../models/post.js'
import auth from '../middleware/auth.js'
import { pipeline, env } from '@xenova/transformers'
import { VideoExtensions, PostMediaDirectory } from '../utils.mjs'

const LLM = {
	enabled: process.env.LLM_ENABLE ?? true,
	API: process.env.LLM_API ?? 'http://localhost:11434',
	nsfwModel: 'AdamCodd/vit-base-nsfw-detector',
	model: process.env.LLM_MODEL ?? 'llava:7b',
	prompt: process.env.LLM_PROMPT ?? `Create a list of tags for this image. Tags should be simple, prefer one word. Your response should be a comma-separated list of tags`
}

export const router = Router()

// LLM setup
env.cacheDir = '.llm-cache'
const Classifier = (process.env.DETECT_NSFW ?? true) ? await pipeline('image-classification', LLM.nsfwModel) : null

if(LLM.API.endsWith('/'))
	LLM.API = LLM.API.substring(0, LLM.API.length - 1)

const CheckOllamaAvailable = async () =>
{
	if(!LLM.enabled)
		return // Check if disabled using environment variable

	// Disable until confirmed working
	LLM.enabled = false

	let response = await fetch(LLM.API)
							.catch(() => {})
	if(response?.status != 200) return

	const responseText = await response.text()
	if(responseText != 'Ollama is running') return

	// Get list of models available
	response = await fetch(`${LLM.API}/api/tags`)
						.catch(() => {})
	
	if(response?.status != 200) return

	const models = (await response.json()).models
	const desiredModel = models.find(x => x.model.toLowerCase() == LLM.model.toLowerCase())
	if(desiredModel)
	{
		console.log(`Running LLM model: ${LLM.model}`)
		LLM.enabled = true
	}
	else
		console.log(`LLM model '${LLM.model}' was not found on Ollama, image recognition is disabled`)
}
try { CheckOllamaAvailable() } catch {}

export async function checkNSFW(imagePath) {
	return await Classifier(imagePath)
}

const generateTags = (imageBase64) => new Promise(async (resolve, reject) => {
	const response = await fetch(`${LLM.API}/api/generate`, {
		method: 'POST',
		body: JSON.stringify({
			model: LLM.model,
			prompt: LLM.prompt,
			images: [ imageBase64 ],
			stream: false // Get single response
		}) 
	})

	if(response.status == 404)
		return reject('Image recognition unavailable')

	const json = await response.json()

	if(json.error)
		return reject(`Failed to get image tags - ${json.error}`)

	let tags = json.response?.split(',') ?? []
	tags = tags.map(x => x.trim().replaceAll(' ', '-').toLowerCase())

	resolve(tags)
})

/*
	Gets tags for specific post.
	Uses Ollama as image classification to get a list of recommended tags.

	Also checks if likely an NSFW image, appends 'explicit' tag if so.
*/
router.get('/tags/:id', auth, async (req, res) => {
	if(!LLM.enabled)
		return res.json({ tags, warning: 'Image recognition is not enabled on this instance' })

	let post = await Post.findById(req.params.id)
	if(!post)
		return res.status(404).send({ error: 'Post not found' })

	let extension = post.filepath.substring(post.filepath.lastIndexOf('.'))
	if(VideoExtensions.includes(extension))
		return res.status(400).json({ error: `Video files are not supported for tag classification` })

	generateTags(fs.readFileSync(`${PostMediaDirectory}/${post.filepath}`).toString('base64'))
		.then(tags => res.json({ tags, success: true }))
		.catch(error => res.status(500).json({ error }))
})

/*
	Uses Ollama as image classification to get a list of recommended tags.
*/
router.post('/tags', auth, async (req, res) => {
	if(!LLM.enabled)
		return res.status(200).json({ tags: [], warning: 'Image recognition is not enabled on this instance' })

	if(![ 'image/jpeg', 'image/png', 'image/webp' ].includes(req.headers['content-type']))
		return res.status(404).json({ error: 'Only png and jpeg image formats are supported' })

	generateTags(req.body.toString('base64'))
		.then(tags => res.json({ tags, success: true }))
		.catch(error => res.status(500).json({ error }))
})