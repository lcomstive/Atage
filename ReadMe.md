<!-- Based off https://github.com/othneildrew/Best-README-Template -->

<div align="center">
  <a href="https://github.com/github_username/repo_name">
    <img src="images/logo.png" alt="Logo" width="80" height="80">
  </a>

<h3 align="center">Atage</h3>

  <p align="center">
    Tag-based image board
    <br />
    <a href="https://github.com/github_username/repo_name"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://atage.lewiscomstive.com">View Demo</a>
    ·
    <a href="https://github.com/lcomstive/Atage/issues/new?labels=bug">Report Bug</a>
    ·
    <a href="https://github.com/lcomstive/Atage/issues/new?labels=enhancement">Request Feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about">About The Project</a>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

## About

## Getting Started

### Prerequisites
 - [Node.js](https://nodejs.org)
 - [MongoDB](https://mongodb.com)

> The project can also be run as a [docker container](https://hub.docker.com/r/lcomstive/atage)

### Installation
```sh
# Clone repo
git clone https://github.com/lcomstive/Atage

# Install npm packages
npm install
npm --prefix web-frontend install
```

## Usage
### Environment Variables
You can use [`.env.example`](./.env.example) and [`web-frontend/.env.example`](./web-frontend/.env.example) as templates.

Environment variables can either be set using `.env` files (*recommended*), or in your system.

| Name | Default | Description |
|:----:|:-------:|:------------|
| `MONGO_IP` | `127.0.0.1` | Address of MongoDB connection |
| `MONGO_PORT` | `27017` | Port of MongoDB connection |
| `MONGO_DBNAME` | `atage` | Name of MongoDB database |
| `EXPRESS_SECRET` | | [express-session](https://expressjs.com/en/resources/middleware/session.html) secret to sign session IDs |
| `PORT` | `3000` | Port for server to listen on |
| `SSL_KEY`, `SSL_CERT` | | Key and certificate for HTTPS connection (defaults to insecure HTTP if empty) |
| `LLM_ENABLE` | `true` | Try connecting to an [Ollama](https://ollama.com) API for suggesting tags |
| `LLM_API` | `http://localhost:11434` | Address of [Ollama](https://ollama.com) connection |
| `LLM_MODEL` | `llava:7b` | Multi-modal model to use for generating tags |
| `LLM_PROMPT` | `Create a list of tags for this image...` | Prompt to serve to Ollama when generating tags |
| `DETECT_NSFW` | `true` | Append `explicit` tag if detected NSFW (*does not use Ollama*) |
| `DEFAULT_API_POST_COUNT` | `20` | Used for pagination, default number of results returned from API if `count` query parameter is not present  |

#### Web Frontend
> The web frontend needs to be rebuilt when changing these

> Uses `web-frontend/.env` file

| Name | Default | Description |
|:----:|:-------:|:------------|
| `API_URL` | `http://localhost:3000/api` | Address of Atage server |

### Running
```sh
# Build the web frontend
npm run web:build

# Start the server
node .
```

### Docker
`TODO: Fill this out`

### Developing
Generate the `web-frontend/dist` to get started `npm run web:build`

To run the API server in dev mode use `npm run dev`
To run the web frontend in dev mode use `npm run web:dev`

### LLM Setup
[Ollama](https://ollama.com) is used for generating suggested tags, follow the instructions on their website to install to your system.

Once Ollama is running, prepare for running with Atage, download the model you'll be using

```sh
ollama pull llava:7b # or whichever model you choose
```

## Roadmap

 - [ ] Admin dashboard
    - [ ] User management
    - [ ] Tag management
    - [ ] Post management
 - [ ] Meta tags

See the [open issues](https://github.com/lcomstive/Atage/issues) for a full list of proposed features (and known issues).

## Contributing

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

Distributed under the [MIT License](./License.md)

## Acknowledgments

Main software and packages used:
 - [NodeJS](https://nodejs.org)
 - [MongoDB](https://mongodb.com)
 - [Astro](https://astro.build)
 - 