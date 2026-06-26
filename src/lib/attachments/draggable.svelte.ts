import { untrack } from 'svelte';
import type { Attachment } from 'svelte/attachments';

export type DragAxis = 'x' | 'y' | 'both';

export interface DragPosition {
	x: number;
	y: number;
}

export interface DragBoundsPadding {
	top?: number;
	right?: number;
	bottom?: number;
	left?: number;
}

export interface DragEventData {
	offset: DragPosition;
	rootNode: HTMLElement;
	currentNode: HTMLElement;
	event: PointerEvent;
}

export interface DragOptions {
	axis?: DragAxis;
	handle?: string;
	bounds?: 'parent' | string | HTMLElement;
	boundsPadding?: DragBoundsPadding;
	defaultPosition?: DragPosition;
	disabled?: boolean;
	touchAction?: string;
	onDragStart?: (data: DragEventData) => void;
	onDrag?: (data: DragEventData) => void;
	onDragEnd?: (data: DragEventData) => void;
}

export function draggable(getOptions: () => DragOptions): Attachment<HTMLElement> {
	return (node: HTMLElement) => {
		let offsetX = 0;
		let offsetY = 0;

		let opts: DragOptions = {};
		let pointerId = -1;
		let dragging = false;
		let dragController: AbortController | null = null;

		let startClientX = 0;
		let startClientY = 0;
		let baseX = 0;
		let baseY = 0;
		let activeAxis: DragAxis = 'both';
		let minX = -Infinity;
		let maxX = Infinity;
		let minY = -Infinity;
		let maxY = Infinity;

		let rafId = 0;
		let lastClientX = 0;
		let lastClientY = 0;
		let lastEvent: PointerEvent | null = null;

		function writeTransform() {
			node.style.transform =
				offsetX === 0 && offsetY === 0 ? '' : `translate3d(${offsetX}px, ${offsetY}px, 0)`;
		}

		function buildData(event: PointerEvent): DragEventData {
			return {
				offset: { x: offsetX, y: offsetY },
				rootNode: node,
				currentNode: node,
				event,
			};
		}

		function computeBounds() {
			minX = -Infinity;
			maxX = Infinity;
			minY = -Infinity;
			maxY = Infinity;

			const b = opts.bounds;
			if (!b) return;

			let boundsEl: HTMLElement | null;
			if (b === 'parent') boundsEl = node.parentElement;
			else if (typeof b === 'string') boundsEl = document.querySelector<HTMLElement>(b);
			else boundsEl = b;
			if (!boundsEl) return;

			const pad = opts.boundsPadding ?? {};
			const boundsRect = boundsEl.getBoundingClientRect();
			const nodeRect = node.getBoundingClientRect();

			const originLeft = nodeRect.left - offsetX;
			const originTop = nodeRect.top - offsetY;
			const originRight = nodeRect.right - offsetX;
			const originBottom = nodeRect.bottom - offsetY;

			minX = boundsRect.left + (pad.left ?? 0) - originLeft;
			maxX = boundsRect.right - (pad.right ?? 0) - originRight;
			minY = boundsRect.top + (pad.top ?? 0) - originTop;
			maxY = boundsRect.bottom - (pad.bottom ?? 0) - originBottom;

			if (minX > maxX) minX = maxX = (minX + maxX) / 2;
			if (minY > maxY) minY = maxY = (minY + maxY) / 2;
		}

		function computeOffset() {
			let nx = baseX + (lastClientX - startClientX);
			let ny = baseY + (lastClientY - startClientY);

			if (activeAxis === 'x') ny = baseY;
			else if (activeAxis === 'y') nx = baseX;

			if (nx < minX) nx = minX;
			else if (nx > maxX) nx = maxX;
			if (ny < minY) ny = minY;
			else if (ny > maxY) ny = maxY;

			offsetX = nx;
			offsetY = ny;
		}

		function flush() {
			rafId = 0;
			if (!dragging) return;

			computeOffset();
			writeTransform();
			if (lastEvent) opts.onDrag?.(buildData(lastEvent));
		}

		function onPointerMove(e: PointerEvent) {
			if (e.pointerId !== pointerId) return;

			lastClientX = e.clientX;
			lastClientY = e.clientY;
			lastEvent = e;

			if (!dragging) {
				dragging = true;
				node.style.willChange = 'transform';
				opts.onDragStart?.(buildData(e));
			}

			if (!rafId) rafId = requestAnimationFrame(flush);
		}

		function onPointerUp(e: PointerEvent) {
			if (!dragController || e.pointerId !== pointerId) return;

			dragController.abort();
			dragController = null;
			if (rafId) {
				cancelAnimationFrame(rafId);
				rafId = 0;
			}
			try {
				node.releasePointerCapture(pointerId);
			} catch {
				/* capture may already be released */
			}

			const wasDragging = dragging;
			dragging = false;
			node.style.willChange = '';

			if (wasDragging) {
				computeOffset();
				writeTransform();
				opts.onDragEnd?.(buildData(e));
			}

			pointerId = -1;
		}

		function onPointerDown(e: PointerEvent) {
			if (e.button !== 0 || dragController) return;

			opts = getOptions();
			if (opts.disabled) return;

			if (opts.handle) {
				const target = e.target as Element | null;
				const found = target?.closest(opts.handle);
				if (!found || !node.contains(found)) return;
			}

			e.preventDefault();

			pointerId = e.pointerId;
			startClientX = e.clientX;
			startClientY = e.clientY;
			lastClientX = e.clientX;
			lastClientY = e.clientY;
			lastEvent = e;
			baseX = offsetX;
			baseY = offsetY;
			activeAxis = opts.axis ?? 'both';

			computeBounds();
			node.setPointerCapture(pointerId);

			dragController = new AbortController();
			const { signal } = dragController;
			node.addEventListener('pointermove', onPointerMove, { signal });
			node.addEventListener('pointerup', onPointerUp, { signal });
			node.addEventListener('pointercancel', onPointerUp, { signal });
			node.addEventListener('lostpointercapture', onPointerUp, { signal });
		}

		untrack(() => {
			const o = getOptions();
			if (o.touchAction) node.style.touchAction = o.touchAction;
			if (o.defaultPosition) {
				offsetX = o.defaultPosition.x;
				offsetY = o.defaultPosition.y;
				writeTransform();
			}
		});

		node.addEventListener('pointerdown', onPointerDown);

		return () => {
			node.removeEventListener('pointerdown', onPointerDown);
			dragController?.abort();
			dragController = null;
			if (rafId) cancelAnimationFrame(rafId);
		};
	};
}
