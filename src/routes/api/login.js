const express = require('express')

const router = express.Router()

router.get('/test', (req, res) => res.type('text').send('Hello, world'))

module.exports = router