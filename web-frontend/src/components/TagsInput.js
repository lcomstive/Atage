const MinTagLength = 0 // Minimum characters to begin searching tags
const TagInputRegex = new RegExp('^[0-9a-zA-Z\-\_\(\)\:]*$');
const TagTemplate = `<a class="tag" data-tagname="{name}" data-action="remove">{name}</a>`;
const SuggestedTagTemplate =   `<a class="tag suggested" data-action="suggested" data-tagname="{name}">
									{name}
									<span data-tooltip="This tag was suggested. Click to add!" data-flow="bottom">✨</span>
								</a>`;
const TagsEventName = 'tagsChanged';

export class TagInput {
	constructor(container, allowNewTags) {
		this.container = container;
		this.fields = {
			input: container.getElementsByTagName('input')[0],
			results: container.getElementsByClassName('tagsInputResults')[0],
			selected: container.getElementsByClassName('tagsInputSelected')[0],
			add: container.getElementsByClassName('tagsAdd')[0]
		};

		this.selectedTags = [];
		this.suggestedTags = [];
		this.highlightedTag = null;
		this.showingAutocomplete = false;
		this.allowNewTags = allowNewTags || this.fields.add;

		this.container.addEventListener('click', ev => this.#onTagClicked(ev));
		this.fields.input.addEventListener('beforeinput', this.#checkInput);
		this.fields.input.addEventListener('input', () => this.#beginSearch());
		this.fields.input.addEventListener('keydown', ev => this.#checkSpecialKeys(ev));
		this.fields.input.addEventListener('click', () => this.search());

		this.container.parentElement.addEventListener('click', ev => this.#documentClicked(ev));

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

		this.debounceTimer = setTimeout(() => {
			fetch(`/api/tags?search=${value}&sort=-postCount&count=25`)
				.then(response => response.json())
				.then(tags => {
					tags = tags.filter(x => !this.selectedTags.includes(x.name));
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
					`<li data-tagname="${tag.name}" data-action="add">
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
		this.container.dispatchEvent(new CustomEvent(TagsEventName, { detail: this.selectedTags }));
	}

	addNewTag(name) {
		this.fields.input.value = '';
		this.closeAutocomplete();

		name = name.toLowerCase();
		if(!name || name == '' || this.selectedTags.includes(name))
			return;

		this.addTag(name);
	}

	removeTag(name) {
		let index = this.selectedTags.indexOf(name.toLowerCase());
		if(index < 0)
			return; // Not found

		this.selectedTags.splice(index, 1);
		this.#refreshSelectedList();
		this.container.dispatchEvent(new CustomEvent(TagsEventName, { detail: this.selectedTags }));
	}

	generateSuggestedTags(postID) {
		fetch(`/api/generate/tags/${postID}`)
			.then(response => response.json())
			.then(data => {
				if(data.error)
					return console.error(`Failed to generate suggested tags - ${data.error}`);
				else if(!data.success)
					return console.error(`Failed to generate suggest tags - unknown error`);

				this.suggestedTags = data.tags.filter(x => !this.selectedTags.includes(x));
				this.#refreshSelectedList();
			})
			.catch(err => console.error(err));
	}

	#refreshSelectedList() {
		this.fields.selected.innerHTML = '';
		for(let i = 0; i < this.selectedTags.length; i++)
			this.fields.selected.innerHTML += TagTemplate.replaceAll('{name}', this.selectedTags[i]);

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
			case 'add':
				this.addTag(tag);
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
}
