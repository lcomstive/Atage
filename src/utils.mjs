import { join } from 'path'

export const ThumbnailExtension = '_thumbnail.webp'
export const VideoExtensions =[ '.mp4', '.mpeg4', '.ogg', '.mov', '.mkv' ]

export const PostMediaDirectory = join(import.meta.dirname, '/../user-content')

// Valid post media extensions
export const PostMediaFilters =
[
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
].join(', ')

export const translateSortQuery = (query) =>
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