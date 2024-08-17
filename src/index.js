const fs = require('fs')
const https = require('https')
const express = require('express')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const compression = require('compression')
const expressEdge = require('express-edge')
const mongoStore = require('connect-mongo')
const fileUpload = require('express-fileupload')
const expressSession = require('express-session')
const Tag = require('./models/tag')
const Post = require('./models/post')

const auth = require('./middleware/auth')

require('dotenv').config()

// Connect to MongoDB
let mongoIP 	= process.env.MONGO_IP || '127.0.0.1'
let mongoPort 	= process.env.MONGO_PORT || 27017
let dbName		= process.env.MONGO_DBNAME || 'atage'
mongoose.connect(`mongodb://${mongoIP}:${mongoPort}/${dbName}`, { autoIndex: true })
	.then(() => console.log('Connected to database'))
	.catch(err => console.error('Failed to connect to database', err))

// Set up express app
const app = new express()

app.use(expressEdge)
app.use(compression())
app.use(bodyParser.json())
app.use(express.static('public'))
app.set('views', __dirname + '/views')
app.use(fileUpload({ createParentPath: true }))
app.use(bodyParser.urlencoded({ extended: true }))

app.use(expressSession({
	resave: false,
	secure: true,
	saveUninitialized: false,
	secret: process.env.EXPRESS_SECRET || 'ExpressSecretThatShouldNotBeShared',
	store: mongoStore.create({ client: mongoose.connection.getClient() })
}))

// Routing
app.use('/api/tags', require('./routes/api/tags'))
app.use('/api/posts', require('./routes/api/posts'))
app.use(require('./routes/api/login'))
app.use('/api/user', require('./routes/api/user'));

const loginRoutes = require('./routes/login')
app.get('/login', loginRoutes.login)
app.get('/logout', loginRoutes.logout)
app.get('/register', loginRoutes.register)

app.use('/tags', require('./routes/tags'))
app.use('/posts', require('./routes/posts'))
app.get('/', (req, res) => res.render('home', { user: req.session?.user }))

// Fallback to 404 not found
app.get('*', require('./routes/404'))

// Start listening
let port = process.env.PORT || 3000
let sslKey = process.env.SSL_KEY
let sslCert = process.env.SSL_CERT

onServerStart = async () => {
	console.log(`Server started on port ${port}`)

	// Update tag post counts
	let tags = await Tag.find({})
	for(let i = 0; i < tags.length; i++)
	{
		tags[i].postCount = await Post.countDocuments({ tags: tags[i]._id })

		if(tags[i].postCount > 0)
			await tags[i].save()
		else
			await Tag.findByIdAndDelete(tags[i]._id)
	}
}

if(sslKey && sslCert)
{
	app.set('trust proxy', 1) // Trust first proxy
	app.enable('trust proxy')

	https.createServer({
		key: fs.readFileSync(sslKey),
		cert: fs.readFileSync(sslCert)
	}, app).listen(port, onServerStart)
}
else
{
	console.log('Starting in insecure (HTTP) mode')
	console.log('Please set the SSL_KEY and SSL_CERT environment variables if you want to use HTTPS')

	app.listen(port, onServerStart)
}