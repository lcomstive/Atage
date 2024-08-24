const MinTagLength = 0 // Minimum characters to begin searching tags
const TagInputRegex = new RegExp('^[0-9a-zA-Z\-\_\(\)\:]*$');
const TagTemplate = `<a class="tag {class}" data-tagname="{name}" data-action="{action}" data-flow="bottom" data-tooltip="{tooltip}" style="{style}">{name} {additionalText}</a>`;
const TagsEventName = 'tagsChanged';

const SuggestedTagTemplate = `<a class="tag suggested" data-action="suggested" data-tagname="{name}">
									{name}
									<span data-tooltip="This tag was suggested. Click to add!" data-flow="bottom">✨</span>
								</a>`;
const NegativeTagTemplate = `<a class="tag negative" data-action="remove-negative" data-tagname="{name}">{name}</a>`

const TagHandlers = new Map([
	[ 'default', { action: 'remove' }],
	[ 'explicit', { tooltip: 'This image is suspected to be NSFW', style: 'background: rgba(var(--error), 0.1); color: rgb(var(--error), 0.8)' }],
	[ 'anime', { action: 'remove', tooltip: 'UwU' }]
])

export class TagInput {
	constructor(container, allowNewTags, allowNegativeTags = true) {
		this.container = container;
		this.fields = {
			input: container.getElementsByTagName('input')[0],
			results: container.getElementsByClassName('tagsInputResults')[0],
			selected: container.getElementsByClassName('tagsInputSelected')[0],
			add: container.getElementsByClassName('tagsAdd')[0]
		};

		this.selectedTags = [];
		this.negativeTags = [];
		this.suggestedTags = [];
		this.highlightedTag = null;
		this.showingAutocomplete = false;
		this.allowNewTags = allowNewTags || this.fields.add;
		this.allowNegativeTags = allowNegativeTags;

		this.container.addEventListener('click', ev => this.#onTagClicked(ev));
		this.fields.input.addEventListener('beforeinput', this.#checkInput);
		this.fields.input.addEventListener('input', () => this.#beginSearch());
		this.fields.input.addEventListener('keydown', ev => this.#checkSpecialKeys(ev));
		this.fields.input.addEventListener('click', () => this.search());

		document.addEventListener('click', ev => this.#documentClicked(ev));

		if(this.fields.add || allowNewTags)
			this.fields.add.addEventListener('click', () => this.#addButtonClicked());

		this.closeAutocomplete();
		this.#refreshSelectedList();
	}

	// "Debouncing" is delaying search queries by a small amount,
	// 	in case the user changes the search query while an search is already being done
	// 	(e.g. while typing a word)
	search(value = '') {
		if(this.debounceTimer != null)
			clearTimeout(this.debounceTimer);

		let negative = value.startsWith('-')
		if(negative)
			value = value.substring(1) // Exclude negative operator from tag search
		negative = negative && this.allowNegativeTags

		this.debounceTimer = setTimeout(() => {
			fetch(`/api/tags?search=${value}&sort=-postCount&count=25`)
				.then(response => response.json())
				.then(tags => {
					tags = tags.filter(x => !this.selectedTags.includes(x.name) && !this.negativeTags.includes(x.name));
					this.highlightedTag = -1;
					if(tags.length == 0)
					{
						this.closeAutocomplete();
						return;
					}

					this.showingAutocomplete = true;
					this.fields.results.style.display = 'block';
					
					let html = '';
					tags.forEach(tag => html +=
					`<li data-tagname="${tag.name}" data-action="${!negative ? 'add' : 'add-negative'}">
						<p>${tag.name}</p>
						<span class="postCount">${tag.postCount}</span>
					</li>`);
					this.fields.results.innerHTML = html;
				})
				.catch(err => console.error('Failed to query tags', err))
				.finally(() => this.debounceTimer = null);
		}, 100 /* milliseconds */);
	}

	closeAutocomplete() {
		this.showingAutocomplete = false;
		this.fields.results.style.display = 'none';
	}

	addTag(name) { this.addTags([ name.toLowerCase() ])}

	addTags(names) {
		this.selectedTags.push(...names);
		this.#refreshSelectedList();
		this.#dispatchTagChangeEvent();
	}

	addNegativeTag(name) { this.addNegativeTags([ name.toLowerCase() ]) }

	addNegativeTags(names) {
		this.negativeTags.push(...names);
		this.#refreshSelectedList();
		this.#dispatchTagChangeEvent();
	}

	addNewTag(name) {
		this.fields.input.value = '';
		this.closeAutocomplete();

		name = name.toLowerCase();
		
		if(name.startsWith('-')) // Remove negation modifier
			name = name.substring(1);

		if(!name || name == '' || this.selectedTags.includes(name) || this.negativeTags.includes(name))
			return;

		this.addTag(name);
	}

	removeTag(name) {
		let index = this.selectedTags.indexOf(name.toLowerCase());
		if(index < 0)
			return; // Not found

		this.selectedTags.splice(index, 1);
		this.#refreshSelectedList();
		this.#dispatchTagChangeEvent();
	}

	removeNegativeTag(name) {
		let index = this.negativeTags.indexOf(name.toLowerCase());
		if(index < 0)
			return; // Not found

		this.negativeTags.splice(index, 1);
		this.#refreshSelectedList();
		this.#dispatchTagChangeEvent();
	}

	generateSuggestedTags(postID) {
		fetch(`/api/generate/tags/${postID}`)
			.then(response => response.json())
			.then(data => {
				console.log(data)
				
				if(data.error)
					return console.error(`Failed to generate suggested tags - ${data.error}`);
				else if(data.warning)
					return console.warn(`Failed to generate suggested tags - ${data.warning}`);
				else if(!data.success)
					return console.error(`Failed to generate suggest tags - unknown error`);

				this.suggestedTags = data.tags.filter(x => !this.selectedTags.includes(x) && !this.negativeTags.includes(x));
				this.#refreshSelectedList();
			})
			.catch(err => console.error(err));
	}

	#dispatchTagChangeEvent() {
		this.container.dispatchEvent(new CustomEvent(TagsEventName, { detail: { selected: this.selectedTags, negated: this.negativeTags } }))
	}

	#refreshSelectedList() {
		this.fields.selected.innerHTML = '';
		for(let i = 0; i < this.selectedTags.length; i++)
			this.fields.selected.innerHTML += this.#GetTagHTML(this.selectedTags[i])

		for(let i = 0; i < this.negativeTags.length; i++)
			this.fields.selected.innerHTML += NegativeTagTemplate.replaceAll('{name}', this.negativeTags[i]);

		for(let i = 0; i < this.suggestedTags.length; i++)
			this.fields.selected.innerHTML += SuggestedTagTemplate.replaceAll('{name}', this.suggestedTags[i]);
	}

	#beginSearch() {
		let search = this.fields.input.value;
		if(search.length >= MinTagLength)
			this.search(search);
	}

	#checkInput(ev) {
		if(ev.data != null && !TagInputRegex.test(ev.data))
			ev.preventDefault();
	}

	#checkSpecialKeys(ev) {
		switch(ev.keyCode) {
			case 32: // Space
				this.search();
				break;
			case 13: // Enter
				if(this.highlightedTag >= 0)
					this.#onTagClicked({ target: this.fields.results.children[this.highlightedTag] });
				else if(this.allowNewTags)
					this.addNewTag(this.fields.input.value);
				else if(this.fields.results.childElementCount > 0) // Use first element in search results
					this.#onTagClicked({ target: this.fields.results.firstElementChild });
				else
					break;

				this.highlightedTag = -1;
				this.fields.input.value = '';
				this.fields.input.focus();
				this.closeAutocomplete();
				break;
			case 9: // TAB
				if(this.highlightedTag >= 0)
					this.#onTagClicked({ target: this.fields.results.children[this.highlightedTag] });
				else if(this.fields.results.childElementCount > 0 && this.showingAutocomplete) // Use first element in search results
					this.#onTagClicked({ target: this.fields.results.firstElementChild });
				else
					break;

				this.highlightedTag = -1;
				this.fields.input.value = '';
				this.closeAutocomplete();
				ev.preventDefault();
				this.fields.input.focus();
				break;
			case 38: // Arrow up
			case 40: // Arrow down
				if(this.fields.results.childElementCount == 0)
					break;

				// Check if there is already a highlighted element
				if(this.highlightedTag == null || this.highlightedTag < 0) {
					// Nothing highlighted, start at top or bottom depending on direction.
					// Arrow up chooses last element, down chooses first element.
					let childIndex = ev.keyCode == 40 ? 0 : (this.fields.results.childElementCount - 1);
					let child = this.fields.results.children[childIndex];
					child.classList.add('highlight');
					child.scrollIntoView();

					this.highlightedTag = childIndex;
					break;
				}

				let newIndex = this.highlightedTag + (ev.keyCode == 40 ? 1 : -1);
				if(newIndex < 0) newIndex = this.fields.results.childElementCount - 1;
				else if(newIndex >= this.fields.results.childElementCount) newIndex = 0;

				this.fields.results.children[this.highlightedTag].classList.remove('highlight');
				this.fields.results.children[newIndex].classList.add('highlight');
				this.fields.results.children[newIndex].scrollIntoView();
				this.highlightedTag = newIndex;
				break;
		}
	}

	#documentClicked(ev) {
		if(!this.fields.results.contains(ev.target))
			this.closeAutocomplete();
	}

	#addButtonClicked() { this.addNewTag(this.fields.input.value); }

	#onTagClicked(ev) {
		let tag = ev.target.dataset.tagname || ev.target.parentElement.dataset.tagname;
		let action = ev.target.dataset.action || ev.target.parentElement.dataset.action;

		if(!tag || !action)
			return;

		switch(action) {
			case 'remove': this.removeTag(tag); break;
			case 'remove-negative': this.removeNegativeTag(tag); break;
			case 'add':
			case 'add-negative':
				if(action == 'add')
					this.addTag(tag);
				else
					this.addNegativeTag(tag);

				this.closeAutocomplete();
				this.fields.input.value = '';
				this.highlightedTag = -1;
				break;
			case 'suggested':
				this.suggestedTags.splice(this.suggestedTags.indexOf(tag), 1);

				this.addTag(tag);
				break;
		}
	}

	#GetTagHTML(tagName, defaultTemplate = 'default') {
		let template = {}
		if(TagHandlers.has(tagName))
			template = TagHandlers.get(tagName);
		else
			template = TagHandlers.get(defaultTemplate);
	
		if(tagName == 'explicit' && this.allowNSFWTagRemoval)
			template.action = 'remove'; // Allow removal
	
		return TagTemplate
				.replaceAll('{name}', tagName)
				.replaceAll('{tooltip}', template.tooltip ?? '')
				.replaceAll('{action}', template.action ?? '')
				.replaceAll('{additionalText}', template.additionalText ?? '')
				.replaceAll('{style}', template.style ?? '');
	}
}
