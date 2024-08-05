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
	].join(', ')
}