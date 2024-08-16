const bcrypt = require('bcrypt')
const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
	username:
	{
		type: String,
		required: true
	},
	password:
	{
		type: String,
		required: true
	},
	createdDate: { type: Date, required: true },
	moderator: { type: Boolean, default: false }
})

module.exports = mongoose.model('User', UserSchema)