export function scrollToElement(element?: HTMLElement | null, focus?: boolean) {
	if (!window || !element) return;

	const elementRect = element.getBoundingClientRect();
	const absoluteElementTop = elementRect.top + window.scrollY;
	const middle = absoluteElementTop - window.innerHeight / 2;
	if (focus) {
		window.setTimeout(() => element.focus(), 0);
	}
	// we only want it to scroll if the element is not within 1/3 of the screen
	if (Math.abs(window.scrollY - middle) < window.innerHeight / 3) return;
	window.scrollTo({ top: middle, behavior: "smooth" });
}
