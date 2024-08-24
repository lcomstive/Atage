import { pipeline, env } from "@xenova/transformers"

export class ImageClassifier
{
	static task = 'image-classification'
	// static model = 'SmilingWolf/wd-vit-tagger-v3'
	static instance = null

	static async getInstance(progressCallback = null)
	{
		if(this.instance == null)
		{
			env.cacheDir = './.llm-cache'
			this.instance = pipeline(this.task, this.model, { progress_callback: progressCallback })
		}

		return this.instance
	}
}