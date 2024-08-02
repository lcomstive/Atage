const { mongoose, ObjectId } = require('mongoose')

const PostSchema = new mongoose.Schema({
	author:
	{
		type: ObjectId,
		required: true
	},
	public: { type: Boolean },
	filepath: { type: String },
	description: { type: String },
	tags: { type: [ObjectId], default: [] }
})

module.exports = mongoose.model('Post', PostSchema)