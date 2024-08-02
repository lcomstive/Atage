setProgress = (progressBar, percent) =>
	progressBar.style.inset = `0 ${100 - percent}% 0 0`