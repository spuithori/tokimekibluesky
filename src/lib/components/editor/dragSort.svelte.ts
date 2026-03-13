import type { Attachment } from 'svelte/attachments';

export function createDragSort() {
	let containerEl: HTMLElement | null = null;
	let draggingIndex: number | null = null;
	let startX = 0;
	let startY = 0;
	let offsetX = 0;
	let offsetY = 0;
	let isDragging = false;
	let isAnimating = false;
	let cloneEl: HTMLElement | null = null;
	let sourceEl: HTMLElement | null = null;
	let getItemsFn: (() => any[]) | null = null;
	let onReorderFn: ((items: any[]) => void) | null = null;
	let cooldownUntil = 0;

	function onPointerMove(e: PointerEvent) {
		if (draggingIndex === null || isAnimating) return;

		if (!isDragging) {
			isDragging = true;
			startClone();
		}

		if (cloneEl) {
			cloneEl.style.left = `${e.clientX - offsetX}px`;
			cloneEl.style.top = `${e.clientY - offsetY}px`;
		}

		if (!containerEl || !getItemsFn || !onReorderFn) return;
		if (Date.now() < cooldownUntil) return;

		const children = Array.from(containerEl.children) as HTMLElement[];
		const items = getItemsFn();
		const fromIndex = draggingIndex;

		for (let i = 0; i < children.length; i++) {
			if (i === fromIndex) continue;
			const rect = children[i].getBoundingClientRect();

			if (
				e.clientX >= rect.left &&
				e.clientX <= rect.right &&
				e.clientY >= rect.top &&
				e.clientY <= rect.bottom
			) {
				const newItems = [...items];
				const [moved] = newItems.splice(fromIndex, 1);
				newItems.splice(i, 0, moved);
				draggingIndex = i;
				onReorderFn(newItems);
				cooldownUntil = Date.now() + 300;
				break;
			}
		}
	}

	function startClone() {
		if (!containerEl || draggingIndex === null) return;

		const children = Array.from(containerEl.children) as HTMLElement[];
		sourceEl = children[draggingIndex];
		if (!sourceEl) return;

		const rect = sourceEl.getBoundingClientRect();
		offsetX = startX - rect.left;
		offsetY = startY - rect.top;

		cloneEl = sourceEl.cloneNode(true) as HTMLElement;
		cloneEl.style.position = 'fixed';
		cloneEl.style.left = `${rect.left}px`;
		cloneEl.style.top = `${rect.top}px`;
		cloneEl.style.width = `${rect.width}px`;
		cloneEl.style.height = `${rect.height}px`;
		cloneEl.style.boxShadow = '0 4px 16px rgba(0,0,0,0.25)';
		cloneEl.style.transform = 'scale(1.03)';
		cloneEl.style.pointerEvents = 'none';
		cloneEl.style.zIndex = '10000';
		cloneEl.style.margin = '0';
		document.body.appendChild(cloneEl);

		sourceEl.style.visibility = 'hidden';
		document.body.style.cursor = 'grabbing';
		document.body.style.userSelect = 'none';
	}

	function cleanup() {
		if (cloneEl) {
			cloneEl.remove();
			cloneEl = null;
		}
		if (sourceEl) {
			sourceEl.style.visibility = '';
			sourceEl = null;
		}
		isDragging = false;
		draggingIndex = null;
		cooldownUntil = 0;
		isAnimating = false;
		document.body.style.cursor = '';
		document.body.style.userSelect = '';
	}

	function onPointerUp() {
		if (!isDragging || !cloneEl || !sourceEl) {
			cleanup();
			return;
		}

		isAnimating = true;
		document.body.style.cursor = '';
		document.body.style.userSelect = '';

		const rect = sourceEl.getBoundingClientRect();
		const matrix = new DOMMatrix(getComputedStyle(sourceEl).transform);
		const finalLeft = rect.left - matrix.m41;
		const finalTop = rect.top - matrix.m42;

		cloneEl.style.transition = 'left 200ms ease, top 200ms ease, transform 200ms ease, box-shadow 200ms ease';
		cloneEl.style.left = `${finalLeft}px`;
		cloneEl.style.top = `${finalTop}px`;
		cloneEl.style.transform = 'scale(1)';
		cloneEl.style.boxShadow = '0 0 0 rgba(0,0,0,0)';

		setTimeout(cleanup, 200);
	}

	function zone(getItems: () => any[], onReorder: (items: any[]) => void): Attachment {
		return (element: Element) => {
			containerEl = element as HTMLElement;
			getItemsFn = getItems;
			onReorderFn = onReorder;

			window.addEventListener('pointermove', onPointerMove);
			window.addEventListener('pointerup', onPointerUp);
			window.addEventListener('pointercancel', onPointerUp);

			return () => {
				cleanup();
				window.removeEventListener('pointermove', onPointerMove);
				window.removeEventListener('pointerup', onPointerUp);
				window.removeEventListener('pointercancel', onPointerUp);
				containerEl = null;
				getItemsFn = null;
				onReorderFn = null;
			};
		};
	}

	function handle(index: number): Attachment {
		return (element: Element) => {
			const el = element as HTMLElement;
			el.style.touchAction = 'none';

			function onPointerDown(e: PointerEvent) {
				if (e.button !== 0) return;
				e.preventDefault();
				startX = e.clientX;
				startY = e.clientY;
				draggingIndex = index;
			}

			el.addEventListener('pointerdown', onPointerDown);

			return () => {
				el.removeEventListener('pointerdown', onPointerDown);
			};
		};
	}

	return { zone, handle };
}
