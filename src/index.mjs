import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import compression from 'compression';
import MongoStore from 'connect-mongo';
import fileUpload from 'express-fileupload';
import expressSession from 'express-session';
import { handler as ssrHandler } from '../web-frontend/dist/server/entry.mjs';
import { config as configEnv } from 'dotenv';

// DB Models
import Tag from './models/tag.js';
import Post from './models/post.js';

// API imports
import userAPI from './routes/user.js';
import tagsAPI from './routes/tags.js';
import loginAPI from './routes/login.js';
import generationAPI from './routes/generation.js';
import { Router as postsAPI } from './routes/posts.js';

configEnv();

const app = express();

app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.text({ type: 'text/*' }));
app.use(bodyParser.raw({ type: 'image/*', limit: '30MB' }));
app.use(fileUpload({ createParentPath: true }));
app.use(bodyParser.urlencoded({ extended: true }));

// Connect to MongoDB
let mongoIP 	= process.env.MONGO_IP || '127.0.0.1';
let mongoPort 	= process.env.MONGO_PORT || 27017;
let dbName		= process.env.MONGO_DBNAME || 'atage';
mongoose.connect(`mongodb://${mongoIP}:${mongoPort}/${dbName}`, { autoIndex: true })
	.then(() => console.log('Connected to database'))
	.catch(err => console.error('Failed to connect to database', err));

app.use(expressSession({
	resave: false,
	secure: true,
	saveUninitialized: false,
	secret: process.env.EXPRESS_SECRET || 'ExpressSecretThatShouldNotBeShared',
	store: MongoStore.create({ client: mongoose.connection.getClient() })
}));

// Frontend //
app.use(express.static('./web-frontend/dist/client/'));
app.use(ssrHandler);

// API //
app.use('/api/tags', tagsAPI);
app.use('/api/posts', postsAPI);
app.use('/api/user', userAPI);
app.use('/api/generate', generationAPI);
app.use(loginAPI);

// Start listening
let port = process.env.PORT || 3000
let sslKey = process.env.SSL_KEY
let sslCert = process.env.SSL_CERT

const onServerStart = async () => {
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