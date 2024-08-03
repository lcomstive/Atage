const MinTagLength = 0 // Minimum characters to begin searching for tags

// Key: Tags autocomplete container element (div w/ 'tagsAutocomplete' class)
// Value: Array of tags that have been selected
let selectedTags = new Map()

let highlightedTag = {
	tag: '',
	container: null
}

const tagListUpdateEvent = new Event('tagListUpdate')
const inputRegex = new RegExp('^[0-9a-zA-Z\-\_\(\)\:]*$')

window.addEventListener('load', ev =>
{
	let inputs = document.getElementsByClassName('tagsAutocomplete')

	for(let i = 0; i < inputs.length; i++)
		registerAutocomplete(inputs[i])
})

// `allowNewTags` lets user add tags that haven't been created previously
registerAutocomplete = (container, allowNewTags = false) =>
{
	if(selectedTags.has(container))
		return

	let inputField = container.getElementsByTagName('input')[0]
	let resultsField = container.getElementsByClassName('tagsAutocompleteResults')[0]
	let selectedField = container.getElementsByClassName('tagsAutocompleteSelected')[0]
	let addButton = container.getElementsByClassName('tagsAutocompleteAdd')[0]

	selectedTags.set(container, new Array())

	inputField.addEventListener('input', checkAutocomplete)
	resultsField.addEventListener('click', selectItem)
	selectedField.addEventListener('click', removeItem)

	// Restrict tag input using regex test
	inputField.addEventListener('beforeinput', ev => {
		if(ev.data != null && !inputRegex.test(ev.data))
			ev.preventDefault()
	})

	// Handle special key cases (e.g. arrow keys, enter, tab)
	inputField.addEventListener('keydown', ev =>
	{
		switch(ev.keyCode)
		{
			case 32: // Space
				getAutocompleteValues(inputField.value, resultsField)
				break
			case 13: // Enter
				if(highlightedTag.tag != '' && highlightedTag.container == container)
					addTag(container, highlightedTag.tag)
				else if(allowNewTags)
					addNewTag(container, inputField)
				else if(resultsField.childElementCount > 0) // First result is used
					addTag(container, resultsField.firstElementChild.innerHTML)
				else
					break

				if(highlightedTag.container == container)
					highlightedTag = { tag: '', container: null }

				inputField.value = ''
				closeAutocompleteResults(resultsField)
				break
			case 9: // TAB
				if(highlightedTag.tag != '' && highlightedTag.container == container)
				{
					addTag(container, highlightedTag.tag)
					highlightedTag = { tag: '', container: null }
				}
				else if(resultsField.firstElementChild)
					addTag(container, resultsField.firstElementChild.innerHTML)
				else
					break
				
				inputField.value = ''
				closeAutocompleteResults(resultsField)

				ev.preventDefault()
				break
			case 38: // Arrow Up
			case 40: // Arrow Down
				if(resultsField.childElementCount == 0)
					break

				// No element currently highlighted
				if(highlightedTag.tag == '' && highlightedTag.container == null)
				{
					let child = resultsField.firstElementChild
					if(ev.keyCode == 38) // Arrow up, choose last element instead
						child = resultsField.lastElementChild
					
					child.classList.add('highlight')
					child.focus()

					highlightedTag = { tag: child.innerHTML, container }
					break
				}

				// Navigate highlight, loop top and bottom
				for(let i = 0; i < resultsField.childElementCount; i++)
				{
					if(resultsField.children[i].innerHTML != highlightedTag.tag)
						continue

					let newIndex = ev.keyCode == 40 ? i + 1 : i - 1
					if(newIndex < 0) newIndex = resultsField.childElementCount - 1
					if(newIndex >= resultsField.childElementCount) newIndex = 0

					resultsField.children[i].classList.remove('highlight')
					resultsField.children[newIndex].classList.add('highlight')
					highlightedTag.tag = resultsField.children[newIndex].innerHTML

					resultsField.children[newIndex].focus()
					break
				}
				break
		}
	})

	document.addEventListener('click', ev =>
	{
		if(!resultsField.contains(ev.target))
			closeAutocompleteResults(resultsField)
	})

	if(addButton && allowNewTags)
		addButton.addEventListener('click', ev => addNewTag(container, inputField))
}

addNewTag = (container, inputField) =>
{
	let tag = inputField.value.toLowerCase()
	inputField.value = ''

	if(tag == '' || selectedTags.get(container).includes(tag))
		return

	addTag(container, tag)

	let resultsField = container.getElementsByClassName('tagsAutocompleteResults')[0]
	if(resultsField)
		resultsField.innerHTML = ''
}

addTagUpdateCallback = (cb) => tagUpdateCallbacks.push(cb)
removeTagUpdateCallback = (cb) => tagUpdateCallbacks.splice(tagUpdateCallbacks.indexOf(cb), 1)

checkAutocomplete = ({ target }) =>
{
	let parent = target.parentNode
	if(parent.classList.contains('horizontal'))
		parent = parent.parentNode

	let search = target.value
	let listField = parent.getElementsByClassName('tagsAutocompleteResults')[0]
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

	container.dispatchEvent(new CustomEvent('tagListUpdate', { detail: selected }))
}

removeTag = (container, tag) =>
{
	let selected = selectedTags.get(container)
	if(!selected)
		return
	
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
}

removeItem = ({ target }) =>
{
	let container = target.parentNode.parentNode
	removeTag(container, target.textContent)
	
	container.dispatchEvent(new CustomEvent('tagListUpdate', { detail: selectedTags.get(container) }))
}

closeAutocompleteResults = (listField) =>
{
	if(highlightedTag.container == listField.parentElement)
		highlightedTag = { tag: '', container: null }

	listField.innerHTML = ''
}
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