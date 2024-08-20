const express = require('express')
const auth = require('../../middleware/auth')

const router = express.Router()

let LLM = {
	API: process.env.LLM_API ?? 'http://localhost:11434',
	model: process.env.LLM_MODEL ?? 'llava:7b',
	prompt: process.env.LLM_PROMPT ?? `Create a list of tags for this image. Tags should be simple, prefer one word. Your response should be a comma-separated list of tags`
}

if(LLM.API.endsWith('/'))
	LLM.API = LLM.API.substring(0, LLM.API.length - 1)

const CheckLLMAvailable = async () =>
{
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
}
try { CheckLLMAvailable() } catch {}

/*
	Uses Ollama as image classification to get a list of recommended tags.
*/
router.post('/tags', auth, async (req, res) =>
{
	if(!LLM.enabled)
		return res.status(500).json({ error: 'Image recognition is not enabled on this instance' })

	if(![ 'image/jpeg', 'image/png', 'image/webp' ].includes(req.headers['content-type']))
		return res.status(404).json({ error: 'Only png and jpeg image formats are supported' })

	const response = await fetch(`${LLM.API}/api/generate`, {
		method: 'POST',
		body: JSON.stringify({
			model: LLM.model,
			prompt: LLM.prompt,
			images: [ req.body.toString('base64') ],
			stream: false // Get single response
		}) 
	})

	if(response.status == 404)
		return res.status(500).json({ error: 'Image recognition is not enabled on this instance' })

	const json = await response.json()

	let tags = json.response.split(',')
	tags = tags.map(x => x.trim().replaceAll(' ', '-'))

	return res.json({ success: true, tags })
})

module.exports = router