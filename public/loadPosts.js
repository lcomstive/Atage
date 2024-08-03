loadPosts = async (tags, options, callback) =>
{
	// console.log(tags)
	let url = '/api/posts'
	if(tags)
		url += encodeURI(`?tags=${tags.join(',')}`)

	if(options.container && !options.append)
		options.container.innerHTML = ''

	fetch(url)
		.then(response => response.json())
		.then(posts =>
		{
			if(options.container && options.container.appendChild)
			{
				for(let i = 0; i < posts.length; i++)
				{
					let img = document.createElement('img')
					img.src = `/api/posts/${posts[i]._id}/thumbnail`
					img.onclick = ev => document.location.href = `/posts/${posts[i]._id}`

					options.container.appendChild(img)
				}
			}

			callback(posts)
		})
		.catch(err => console.error(err))
}