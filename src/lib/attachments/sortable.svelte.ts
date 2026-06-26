import { flushSync } from 'svelte';
import type { Attachment } from 'svelte/attachments';

export interface SortableOptions {
	axis: 'x' | 'y';
	participantSelector: string;
	onReorder: (from: number, to: number) => void;
	handle?: string;
	disabled?: boolean;
	flipDuration?: number;
	flipEasing?: string;
	draggingClass?: string;
	onDragStart?: () => void;
	onDragEnd?: () => void;
}

const DEFAULT_DURATION = 220;
const DEFAULT_EASING = 'cubic-bezier(0.2, 0, 0, 1)';

export function sortable(getOptions: () => SortableOptions): Attachment<HTMLElement> {
	return (node: HTMLElement) => {
		let opts: SortableOptions;
		let horizontal = true;
		let pointerId = -1;
		let started = false;
		let controller: AbortController | null = null;

		let grab = 0;
		let naturalPos = 0;
		let off = 0;
		let current = 0;
		let pointerPos = 0;
		let rafId = 0;

		let draggingClass = 'dragging';
		let duration = DEFAULT_DURATION;
		let easing = DEFAULT_EASING;

		const flipAnims = new Map<HTMLElement, Animation>();
		let dropAnim: Animation | null = null;

		function getParticipants(): HTMLElement[] {
			const parent = node.parentElement;
			if (!parent) return [node];
			return Array.from(parent.querySelectorAll<HTMLElement>(`:scope > ${opts.participantSelector}`));
		}

		function writeTransform() {
			node.style.transform =
				off === 0 ? '' : horizontal ? `translate3d(${off}px, 0, 0)` : `translate3d(0, ${off}px, 0)`;
		}

		function applyOffset() {
			off = pointerPos - grab - naturalPos;
			writeTransform();
		}

		function centerOf(el: HTMLElement, draggedOffset = 0): number {
			return horizontal
				? el.offsetLeft + draggedOffset + el.offsetWidth / 2
				: el.offsetTop + draggedOffset + el.offsetHeight / 2;
		}

		function computeTarget(participants: HTMLElement[]): number {
			const c = centerOf(node, off);
			let count = 0;
			for (const el of participants) {
				if (el === node) continue;
				if (centerOf(el) < c) count++;
			}
			return count;
		}

		function reorderAndFlip(target: number, participants: HTMLElement[]) {
			const first = new Map<HTMLElement, DOMRect>();
			for (const el of participants) {
				if (el === node) continue;
				first.set(el, el.getBoundingClientRect());
			}

			const from = current;
			flushSync(() => opts.onReorder(from, target));
			current = target;

			const after = getParticipants();

			for (const el of after) {
				if (el === node) continue;
				flipAnims.get(el)?.cancel();
			}

			const last = new Map<HTMLElement, DOMRect>();
			for (const el of after) {
				if (el === node) continue;
				last.set(el, el.getBoundingClientRect());
			}

			for (const el of after) {
				if (el === node) continue;
				const f = first.get(el);
				const l = last.get(el);
				if (!f || !l) continue;
				const dx = f.left - l.left;
				const dy = f.top - l.top;
				if (!dx && !dy) continue;
				const anim = el.animate(
					[{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
					{ duration, easing, fill: 'none' },
				);
				flipAnims.set(el, anim);
				anim.finished
					.then(() => {
						if (flipAnims.get(el) === anim) flipAnims.delete(el);
					})
					.catch(() => {});
			}

			const rect = node.getBoundingClientRect();
			naturalPos = (horizontal ? rect.left : rect.top) - off;
			applyOffset();
		}

		function flush() {
			rafId = 0;
			if (!started) return;
			applyOffset();
			const participants = getParticipants();
			const target = computeTarget(participants);
			if (target !== current) reorderAndFlip(target, participants);
		}

		function onPointerMove(e: PointerEvent) {
			if (e.pointerId !== pointerId) return;
			pointerPos = horizontal ? e.clientX : e.clientY;

			if (!started) {
				started = true;
				node.classList.add(draggingClass);
				node.style.willChange = 'transform';
				document.body.style.userSelect = 'none';
				document.body.style.cursor = 'grabbing';
				opts.onDragStart?.();
			}

			if (!rafId) rafId = requestAnimationFrame(flush);
		}

		function settle() {
			node.classList.remove(draggingClass);
			node.style.willChange = '';
		}

		function endDrag(e: PointerEvent) {
			if (!controller || e.pointerId !== pointerId) return;

			controller.abort();
			controller = null;
			if (rafId) {
				cancelAnimationFrame(rafId);
				rafId = 0;
			}
			pointerId = -1;

			const wasDragging = started;
			started = false;
			if (!wasDragging) return;

			document.body.style.userSelect = '';
			document.body.style.cursor = '';

			dropAnim?.cancel();
			const fromOff = off;
			off = 0;
			node.style.transform = '';

			if (fromOff !== 0) {
				dropAnim = node.animate(
					[
						{
							transform: horizontal
								? `translate3d(${fromOff}px, 0, 0)`
								: `translate3d(0, ${fromOff}px, 0)`,
						},
						{ transform: 'translate3d(0, 0, 0)' },
					],
					{ duration, easing, fill: 'none' },
				);
				dropAnim.finished.then(settle).catch(settle).finally(() => {
					dropAnim = null;
				});
			} else {
				settle();
			}

			opts.onDragEnd?.();
		}

		function onPointerDown(e: PointerEvent) {
			if (e.button !== 0 || controller) return;

			opts = getOptions();
			if (opts.disabled) return;

			if (opts.handle) {
				const target = e.target as Element | null;
				const h = target?.closest(opts.handle);
				if (!h || !node.contains(h)) return;
			}

			horizontal = opts.axis === 'x';
			duration = opts.flipDuration ?? DEFAULT_DURATION;
			easing = opts.flipEasing ?? DEFAULT_EASING;
			draggingClass = opts.draggingClass ?? 'dragging';

			e.preventDefault();
			pointerId = e.pointerId;

			current = getParticipants().indexOf(node);
			const rect = node.getBoundingClientRect();
			pointerPos = horizontal ? e.clientX : e.clientY;
			naturalPos = horizontal ? rect.left : rect.top;
			grab = pointerPos - naturalPos;
			off = 0;

			controller = new AbortController();
			const { signal } = controller;
			window.addEventListener('pointermove', onPointerMove, { signal });
			window.addEventListener('pointerup', endDrag, { signal });
			window.addEventListener('pointercancel', endDrag, { signal });
		}

		node.addEventListener('pointerdown', onPointerDown);

		return () => {
			node.removeEventListener('pointerdown', onPointerDown);
			controller?.abort();
			controller = null;
			if (rafId) cancelAnimationFrame(rafId);
			flipAnims.forEach((a) => a.cancel());
			flipAnims.clear();
			dropAnim?.cancel();
			if (started) {
				document.body.style.userSelect = '';
				document.body.style.cursor = '';
			}
		};
	};
}
