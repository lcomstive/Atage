export function setProgress(progressBar, percent) {
	progressBar.firstElementChild.style.inset = `0 ${100 - Number(percent)}% 0 0`;
}