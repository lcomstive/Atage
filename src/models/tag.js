const { mongoose } = require('mongoose')

const TagSchema = new mongoose.Schema({
	name: { type: String, required: true },
	postCount: { type: Number, default: 0 }
})

module.exports = mongoose.model('Tag', TagSchema)