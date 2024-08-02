const MinTagLength = 0 // Minimum characters to begin searching for tags

// Key: Tags autocomplete container element (div w/ 'tagsAutocomplete' class)
// Value: Array of tags that have been selected
let selectedTags = new Map()

const tagListUpdateEvent = new Event('tagListUpdate')

window.addEventListener('load', ev =>
{
	let inputs = document.getElementsByClassName('tagsAutocomplete')

	for(let i = 0; i < inputs.length; i++)
		registerAutocomplete(inputs[i])
})

registerAutocomplete = (container) =>
{
	let inputField = container.getElementsByTagName('input')[0]
	let resultsField = container.getElementsByClassName('tagsAutocompleteResults')[0]
	let selectedField = container.getElementsByClassName('tagsAutocompleteSelected')[0]

	selectedTags.set(container, new Array())

	inputField.addEventListener('input', checkAutocomplete)
	resultsField.addEventListener('click', selectItem)
	selectedField.addEventListener('click', removeItem)

	document.addEventListener('click', ev =>
	{
		if(!resultsField.contains(ev.target))
			closeAutocompleteResults(resultsField)
	})
}

addTagUpdateCallback = (cb) => tagUpdateCallbacks.push(cb)
removeTagUpdateCallback = (cb) => tagUpdateCallbacks.splice(tagUpdateCallbacks.indexOf(cb), 1)

checkAutocomplete = ({ target }) =>
{
	let search = target.value
	let listField = target.parentNode.getElementsByClassName('tagsAutocompleteResults')[0]
	listField.innerHTML = ''

	if(!search.length || search.length < MinTagLength)
		return // Need more characters in text box

	getAutocompleteValues(search, listField)
}

addTag = (container, tag) => addTags(container, [tag])

addTags = (container, tags) =>
{
	let selected = selectedTags.get(container)
	selected.push(...tags)
	
	let selectedList = container.getElementsByClassName('tagsAutocompleteSelected')[0]
	selectedList.innerHTML = ''
	for(let i = 0; i < selected.length; i++)
		selectedList.innerHTML += `<li>${selected[i]}</li>`
}

removeTag = (container, tag) =>
{
	let selected = selectedTags.get(container)
	selected.splice(selected.indexOf(tag), 1)
	
	let selectedList = container.getElementsByClassName('tagsAutocompleteSelected')[0]
	selectedList.innerHTML = ''
	for(let i = 0; i < selected.length; i++)
		selectedList.innerHTML += `<li>${selected[i]}</li>`
}

selectItem = ({ target }) =>
{
	if(target.tagName !== 'LI')
		return

	let container = target.parentNode.parentNode
	let searchInput = container.getElementsByTagName('input')[0]
	let resultsList = container.getElementsByClassName('tagsAutocompleteResults')[0]
	
	addTag(container, target.textContent)

	searchInput.value = ''
	resultsList.innerHTML = ''

	container.dispatchEvent(new CustomEvent('tagListUpdate', { detail: selectedTags.get(container) }))
}

removeItem = ({ target }) =>
{
	let container = target.parentNode.parentNode
	removeTag(container, target.textContent)
	
	container.dispatchEvent(new CustomEvent('tagListUpdate', { detail: selectedTags.get(container) }))
}

closeAutocompleteResults = (listField) => listField.innerHTML = ''
closeAllAutocompleteResults = () =>
{
	let lists = document.getElementsByClassName('tagsAutocompleteResults')
	lists.forEach(x => closeAutocompleteResults(x))
}

// "Debouncing" is delaying search queries by a small amount,
// incase the user changes the search query (e.g. while typing a word)
let debounceTimer = null
const DebounceTime = 150 // milliseconds
getAutocompleteValues = (search, listField) =>
{
	if(debounceTimer && debounceTimer != null)
		clearTimeout(debounceTimer)

	debounceTimer = setTimeout(() =>
		fetch(`/api/tags?search=${search}`)
			.then(response => response.json())
			.then(tags =>
			{
				let selected = selectedTags.get(listField.parentNode)
				listField.innerHTML = ''
				tags.forEach(x => {
					if(!selected.includes(x.name))
						listField.innerHTML += `<li>${x.name}</li>`
				})
			})
			.catch(err => console.error(`Failed to query tags`, err))
			.finally(() => debounceTimer = null)
	, DebounceTime)
}