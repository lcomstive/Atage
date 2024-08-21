const { mongoose, ObjectId } = require('mongoose')

const PostSchema = new mongoose.Schema({
	author:
	{
		type: ObjectId,
		required: true
	},
	public: Boolean,
	filepath: String,
	description: String,
	tags: { type: [ObjectId], default: [] },
	date: Date
})

module.exports = mongoose.model('Post', PostSchema)