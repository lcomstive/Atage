const mongoose = require('mongoose')

const PostSchema = new mongoose.Schema({
	author:
	{
		type: ObjectId,
		required: true
	},
	public: { type: Boolean },
	filepath: { type: String, required: true }
})

module.exports = mongoose.model('Post', PostSchema)