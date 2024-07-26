const { mongoose, ObjectId } = require('mongoose')

const TagSchema = new mongoose.Schema({
	name: { type: String, required: true },
	aliases: { type: [String] },
	parent: { type: ObjectId },
	children: { type: [ObjectId] },
	postCount: { type: Number, default: 0 }
})

module.exports = mongoose.model('Tag', TagSchema)