import { flushSync } from 'svelte';
import type { Attachment } from 'svelte/attachments';

type Rect = { x: number; y: number; w: number; h: number };

export interface TileTarget {
	kind: 'split';
	id: string;
	zone: 'top' | 'bottom' | 'left' | 'right';
	rect: Rect;
}

export interface ExtractTarget {
	kind: 'extract';
	beforeId: string | null;
	lineX: number;
	top: number;
	height: number;
}

export type DropPreview = TileTarget | ExtractTarget;

export interface SortableOptions {
	axis: 'x' | 'y';
	participantSelector: string;
	onReorder: (from: number, to: number) => void;
	handle?: string;
	disabled?: boolean;
	flipDuration?: number;
	flipEasing?: string;
	draggingClass?: string;
	onDragStart?: (dragId: string | null) => void;
	onDragEnd?: () => void;
	tileSelector?: string;
	onTilePreview?: (preview: DropPreview | null) => void;
	onTile?: (sourceId: string, target: TileTarget) => void;
	onExtract?: (sourceId: string, target?: ExtractTarget) => void;
	onDragMove?: (clientX: number, clientY: number) => void;
}

const DEFAULT_DURATION = 220;
const DEFAULT_EASING = 'cubic-bezier(0.2, 0, 0, 1)';
const EDGE_PX = 12;
const QUAD_DEADBAND = 0.06;
const REORDER_BAND = 0.25;
const BAND_DEADBAND = 10;

export type Quad = 'top' | 'bottom' | 'left' | 'right';

export function reorderBandPx(height: number): number {
	return Math.min(Math.max(height * REORDER_BAND, 64), 220);
}

export function quadrantZone(
	width: number,
	height: number,
	localX: number,
	localY: number,
	current: Quad | null = null,
	deadband = 0,
): Quad {
	const dx = width > 0 ? localX / width - 0.5 : 0;
	const dy = height > 0 ? localY / height - 0.5 : 0;
	const adx = Math.abs(dx);
	const ady = Math.abs(dy);

	let horizontal: boolean;
	if (current === 'left' || current === 'right') horizontal = adx >= ady - deadband;
	else if (current === 'top' || current === 'bottom') horizontal = adx >= ady + deadband;
	else horizontal = adx >= ady;

	if (horizontal) {
		if (current === 'left') return dx <= deadband ? 'left' : 'right';
		if (current === 'right') return dx >= -deadband ? 'right' : 'left';
		return dx < 0 ? 'left' : 'right';
	}
	if (current === 'top') return dy <= deadband ? 'top' : 'bottom';
	if (current === 'bottom') return dy >= -deadband ? 'bottom' : 'top';
	return dy < 0 ? 'top' : 'bottom';
}

export function insertionIndexAt(cols: { left: number; right: number }[], x: number): number {
	return cols.filter((r) => (r.left + r.right) / 2 < x).length;
}

type Box = { left: number; right: number; top: number; bottom: number };

export function dockZoneAt(
	rects: readonly Box[],
	clientX: number,
	clientY: number,
	edge = EDGE_PX,
): { index: number; lineX: number } | null {
	if (!rects.length) return null;
	const deckTop = Math.min(...rects.map((r) => r.top));
	const deckBottom = Math.max(...rects.map((r) => r.bottom));
	if (clientY < deckTop || clientY > deckBottom) return null;

	for (let i = 0; i < rects.length; i++) {
		const r = rects[i];
		if (clientX >= r.left && clientX < r.right) {
			const localX = clientX - r.left;
			if (localX <= edge) return { index: i, lineX: r.left };
			if (localX >= r.right - r.left - edge) return { index: i + 1, lineX: r.right };
			return null;
		}
	}

	const first = rects[0];
	const last = rects[rects.length - 1];
	if (clientX < first.left || clientX >= last.right) return null;
	const index = insertionIndexAt(rects, clientX);
	return { index, lineX: (rects[index - 1].right + rects[index].left) / 2 };
}

export function detectTileAt(clientX: number, clientY: number): ExtractTarget | null {
	const cols = Array.from(document.querySelectorAll<HTMLElement>('.deck > .deck-row-wrap'));
	if (!cols.length) return null;
	const rects = cols.map((c) => c.getBoundingClientRect());
	const zone = dockZoneAt(rects, clientX, clientY);
	if (!zone) return null;
	const ref = cols[zone.index];
	const beforeId = ref ? ((ref.querySelector('[data-tile-id]') as HTMLElement | null)?.dataset.tileId ?? null) : null;
	return { kind: 'extract', beforeId, lineX: zone.lineX, top: rects[0].top, height: rects[0].height };
}

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
		let clientX = 0;
		let clientY = 0;
		let rafId = 0;

		let dragId: string | null = null;
		let leafMode = false;
		let dropTarget: DropPreview | null = null;

		function setDrop(t: DropPreview | null) {
			const changed =
				t?.kind !== dropTarget?.kind ||
				(t?.kind === 'split' &&
					(t.id !== (dropTarget as TileTarget)?.id || t.zone !== (dropTarget as TileTarget)?.zone)) ||
				(t?.kind === 'extract' && t.beforeId !== (dropTarget as ExtractTarget)?.beforeId);
			dropTarget = t;
			if (changed) opts.onTilePreview?.(t);
		}

		function detectTile() {
			if (!opts.tileSelector || !dragId) return setDrop(null);
			const hit = document.elementFromPoint(clientX, clientY);
			const el = hit?.closest(opts.tileSelector) as HTMLElement | null;
			const id = el?.dataset.tileId;

			if (leafMode) {
				if (el && id) {
					const wrapper = (el.closest(opts.participantSelector) as HTMLElement | null) ?? el;
					if (wrapper === node) return setDrop(null);
					const pr = el.getBoundingClientRect();
					const cur: Quad | null =
						dropTarget?.kind === 'split' && dropTarget.id === id ? dropTarget.zone : null;
					const zone = quadrantZone(pr.width, pr.height, clientX - pr.left, clientY - pr.top, cur, QUAD_DEADBAND);
					setDrop({ kind: 'split', id, zone, rect: { x: pr.left, y: pr.top, w: pr.width, h: pr.height } });
					return;
				}
				const cols = getParticipants();
				if (cols.length) {
					const rects = cols.map((c) => c.getBoundingClientRect());
					const index = insertionIndexAt(rects, clientX);
					const lineX =
						index <= 0 ? rects[0].left
						: index >= rects.length ? rects[rects.length - 1].right
						: (rects[index - 1].right + rects[index].left) / 2;
					const ref = cols[index] as HTMLElement | undefined;
					setDrop({ kind: 'extract', beforeId: ref ? firstTileIdOf(ref) : null, lineX, top: rects[0].top, height: rects[0].height });
					return;
				}
				return setDrop(null);
			}

			if (el && id && id !== dragId && !node.contains(el)) {
				const r = el.getBoundingClientRect();
				const localY = clientY - r.top;
				const isSplitting = dropTarget?.kind === 'split' && dropTarget.id === id;
				const band = reorderBandPx(r.height);
				const bandThresh = isSplitting ? band - BAND_DEADBAND : band + BAND_DEADBAND;
				if (localY >= bandThresh) {
					const cur: Quad | null = isSplitting ? dropTarget.zone : null;
					const zone = quadrantZone(r.width, r.height, clientX - r.left, localY, cur, QUAD_DEADBAND);
					setDrop({ kind: 'split', id, zone, rect: { x: r.left, y: r.top, w: r.width, h: r.height } });
					return;
				}
			}
			setDrop(null);
		}

		function firstTileIdOf(wrapper: HTMLElement): string | null {
			return (wrapper.querySelector('[data-tile-id]') as HTMLElement | null)?.dataset.tileId ?? null;
		}

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
			if (leafMode) {
				off = 0;
				node.style.transform = '';
				return;
			}
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
			const from = current;
			const lo = Math.min(from, target);
			const hi = Math.max(from, target);

			const first = new Map<HTMLElement, DOMRect>();
			for (let i = lo; i <= hi; i++) {
				const el = participants[i];
				if (!el || el === node) continue;
				first.set(el, el.getBoundingClientRect());
			}

			flushSync(() => opts.onReorder(from, target));
			current = target;

			const after = getParticipants();

			const last = new Map<HTMLElement, DOMRect>();
			for (const el of after) {
				if (el === node || !first.has(el)) continue;
				flipAnims.get(el)?.cancel();
				last.set(el, el.getBoundingClientRect());
			}

			for (const el of after) {
				if (el === node || !first.has(el)) continue;
				const f = first.get(el)!;
				const l = last.get(el)!;
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
			off = leafMode ? 0 : pointerPos - grab - naturalPos;
			if (leafMode) opts.onDragMove?.(clientX, clientY);
			detectTile();
			if (dropTarget || leafMode) {
				writeTransform();
				return;
			}
			const participants = getParticipants();
			const target = computeTarget(participants);
			writeTransform();
			if (target !== current) reorderAndFlip(target, participants);
		}

		function onPointerMove(e: PointerEvent) {
			if (e.pointerId !== pointerId) return;
			pointerPos = horizontal ? e.clientX : e.clientY;
			clientX = e.clientX;
			clientY = e.clientY;

			if (!started) {
				started = true;
				if (!leafMode) {
					node.classList.add(draggingClass);
					node.style.willChange = 'transform';
					node.style.pointerEvents = 'none';
				}
				document.body.style.userSelect = 'none';
				document.body.style.cursor = 'grabbing';
				opts.onDragStart?.(dragId);
			}

			if (!rafId) rafId = requestAnimationFrame(flush);
		}

		function settle() {
			node.classList.remove(draggingClass);
			node.style.willChange = '';
			node.style.pointerEvents = '';
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

			const drop = dropTarget;
			dropTarget = null;
			opts.onTilePreview?.(null);

			if (!wasDragging) {
				dragId = null;
				return;
			}

			document.body.style.userSelect = '';
			document.body.style.cursor = '';

			if (drop?.kind === 'split' && dragId && opts.onTile) {
				off = 0;
				node.style.transform = '';
				settle();
				const sourceId = dragId;
				dragId = null;
				opts.onTile(sourceId, drop);
				opts.onDragEnd?.();
				return;
			}

			if (drop?.kind === 'extract' && dragId && opts.onExtract) {
				off = 0;
				node.style.transform = '';
				settle();
				const sourceId = dragId;
				dragId = null;
				opts.onExtract(sourceId, drop);
				opts.onDragEnd?.();
				return;
			}
			dragId = null;

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

			let handleEl: Element | null = null;
			if (opts.handle) {
				const target = e.target as Element | null;
				handleEl = target?.closest(opts.handle) ?? null;
				if (!handleEl || !node.contains(handleEl)) return;
			}

			horizontal = opts.axis === 'x';
			duration = opts.flipDuration ?? DEFAULT_DURATION;
			easing = opts.flipEasing ?? DEFAULT_EASING;
			draggingClass = opts.draggingClass ?? 'dragging';
			dropTarget = null;

			dragId = null;
			leafMode = false;
			if (opts.tileSelector) {
				const grabbedPane = handleEl?.closest(opts.tileSelector) as HTMLElement | null;
				const primaryPane = node.querySelector(opts.tileSelector) as HTMLElement | null;
				if (grabbedPane?.dataset.tileId) {
					dragId = grabbedPane.dataset.tileId;
					leafMode = grabbedPane !== primaryPane;
				}
			}

			e.preventDefault();
			pointerId = e.pointerId;

			current = getParticipants().indexOf(node);
			const rect = node.getBoundingClientRect();
			pointerPos = horizontal ? e.clientX : e.clientY;
			clientX = e.clientX;
			clientY = e.clientY;
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
				node.style.pointerEvents = '';
			}
		};
	};
}
