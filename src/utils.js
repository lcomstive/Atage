module.exports =
{
	ThumbnailExtension: '_thumbnail.webp',
	VideoExtensions: [ '.mp4', '.mpeg4', '.ogg', '.mov', '.mkv' ],

	// Valid post media extensions
	PostMediaFilters: [
		// Images
		'.png',
		'.jpg',
		'.jpeg',
		'.webp',
		'.gif',
	
		// Video
		'.mp4',
		'.mpeg4',
		'.webm',
		'.ogg',
		'.mov',
		'.mkv'
	].join(', '),

	translateSortQuery: (query) =>
	{
		if(!query?.includes(':')) return query
	
		let parts = query.split(':').map(x => x.trim())
	
		if(parts[0] == 'id')
			parts[0] = '_id'
	
		if(parts[1] == 'desc' || parts[1] == 'descending')
			query = `-${parts[0]}`
		else
			query = parts[0]
	
		return query
	}
}