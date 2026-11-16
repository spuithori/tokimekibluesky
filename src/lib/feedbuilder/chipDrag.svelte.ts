import type { DropTarget, NodeAddr } from './filterModel';

export interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function insertionIndex(boxes: Box[], x: number, y: number): number {
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    if (y < b.top) return i;
    if (y <= b.bottom && x < (b.left + b.right) / 2) return i;
  }
  return boxes.length;
}

export interface Indicator {
  x: number;
  y: number;
  height: number;
}

function indicatorAt(boxes: Box[], index: number): Indicator | null {
  if (boxes.length === 0) return null;
  if (index < boxes.length) {
    const b = boxes[index];
    return { x: b.left - 4, y: b.top, height: b.bottom - b.top };
  }
  const b = boxes[boxes.length - 1];
  return { x: b.right + 4, y: b.top, height: b.bottom - b.top };
}

const MOUSE_THRESHOLD = 6;
const TOUCH_SLOP = 10;
const LONG_PRESS_MS = 400;

interface Session {
  el: HTMLElement;
  root: HTMLElement;
  from: NodeAddr;
  kind: 'leaf' | 'and' | 'or';
  pointerId: number;
  touch: boolean;
  startX: number;
  startY: number;
  started: boolean;
  timer?: ReturnType<typeof setTimeout>;
  ghost?: HTMLElement;
  offsetX: number;
  offsetY: number;
  target: DropTarget | null;
}

export class ChipDrag {
  active = $state(false);

  indicator = $state<Indicator | null>(null);

  private session: Session | null = null;
  private rootEl: HTMLElement | null = null;

  constructor(private readonly onDrop: (from: NodeAddr, to: DropTarget) => void) {}

  root = (el: HTMLElement) => {
    this.rootEl = el;
    el.setAttribute('data-dnd-root', '');
    return () => {
      if (this.rootEl === el) this.rootEl = null;
    };
  };

  draggable = (el: HTMLElement) => {
    const down = (e: PointerEvent) => this.onPointerDown(el, e);
    el.addEventListener('pointerdown', down);
    return () => el.removeEventListener('pointerdown', down);
  };

  private onPointerDown(el: HTMLElement, e: PointerEvent) {
    if (this.session || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const t = e.target as Element;

    if (t.closest('[data-dnd-item]') !== el) return;

    if (t.closest('dialog, input, textarea, select, [contenteditable="true"], [data-dnd-ignore]')) return;
    const root = this.rootEl;
    if (!root || !root.contains(el)) return;
    const group = Number(el.dataset.dndGroup);
    if (!Number.isFinite(group)) return;
    const child = el.dataset.dndChild !== undefined ? Number(el.dataset.dndChild) : undefined;
    const sub = el.dataset.dndSub !== undefined ? Number(el.dataset.dndSub) : undefined;
    const r = el.getBoundingClientRect();
    this.session = {
      el,
      root,
      from: child === undefined ? { group } : sub === undefined ? { group, child } : { group, child, sub },
      kind: el.hasAttribute('data-dnd-or') ? 'or' : el.hasAttribute('data-dnd-and') ? 'and' : 'leaf',
      pointerId: e.pointerId,
      touch: e.pointerType === 'touch',
      startX: e.clientX,
      startY: e.clientY,
      started: false,
      offsetX: e.clientX - r.left,
      offsetY: e.clientY - r.top,
      target: null
    };
    if (this.session.touch) {
      this.session.timer = setTimeout(() => this.begin(), LONG_PRESS_MS);
    }
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onCancel);
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('touchmove', this.onTouchMove, { passive: false });
  }

  private begin() {
    const s = this.session;
    if (!s || s.started) return;
    s.started = true;
    const r = s.el.getBoundingClientRect();
    const ghost = s.el.cloneNode(true) as HTMLElement;
    ghost.removeAttribute('data-dnd-item');
    Object.assign(ghost.style, {
      position: 'fixed',
      left: `${r.left}px`,
      top: `${r.top}px`,
      width: `${r.width}px`,
      margin: '0',
      pointerEvents: 'none',
      zIndex: '10000',
      opacity: '0.9',
      boxShadow: '0 8px 24px rgb(0 0 0 / 0.18)',
      transform: 'scale(1.03)'
    });
    document.body.appendChild(ghost);
    s.ghost = ghost;
    s.el.setAttribute('data-dnd-dragging', '');
    this.active = true;
    if (s.touch && 'vibrate' in navigator) navigator.vibrate?.(10);
  }

  private onMove = (e: PointerEvent) => {
    const s = this.session;
    if (!s || e.pointerId !== s.pointerId) return;
    const dist = Math.hypot(e.clientX - s.startX, e.clientY - s.startY);
    if (!s.started) {
      if (s.touch) {
        if (dist > TOUCH_SLOP) this.end(false);
        return;
      }
      if (dist < MOUSE_THRESHOLD) return;
      this.begin();
    }
    if (s.ghost) {
      s.ghost.style.left = `${e.clientX - s.offsetX}px`;
      s.ghost.style.top = `${e.clientY - s.offsetY}px`;
    }
    this.updateTarget(e.clientX, e.clientY);
  };

  private onTouchMove = (e: TouchEvent) => {
    if (this.session?.started) e.preventDefault();
  };

  private updateTarget(x: number, y: number) {
    const s = this.session;
    if (!s) return;
    const box = (el: Element): Box => el.getBoundingClientRect();
    const inside = (b: Box) => x >= b.left && x <= b.right && y >= b.top && y <= b.bottom;

    if (s.kind === 'leaf') {
      for (const a of s.root.querySelectorAll<HTMLElement>('[data-dnd-and]')) {
        if (!inside(box(a))) continue;
        const items = [...a.querySelectorAll<HTMLElement>('[data-dnd-item][data-dnd-sub]')];
        const boxes = items.map(box);
        const index = insertionIndex(boxes, x, y);
        s.target = { kind: 'and', group: Number(a.dataset.dndGroup), child: Number(a.dataset.dndAnd), index };
        this.indicator = indicatorAt(boxes, index);
        return;
      }
    }

    if (s.kind !== 'or') {
      for (const g of s.root.querySelectorAll<HTMLElement>('[data-dnd-or]')) {
        if (!inside(box(g))) continue;
        const items = [...g.querySelectorAll<HTMLElement>('[data-dnd-item][data-dnd-child]:not([data-dnd-sub])')];
        const boxes = items.map(box);
        const index = insertionIndex(boxes, x, y);
        s.target = { kind: 'group', group: Number(g.dataset.dndOr), index };
        this.indicator = indicatorAt(boxes, index);
        return;
      }
    }

    const tops = [...s.root.querySelectorAll<HTMLElement>('[data-dnd-top]')];
    const boxes = tops.map(box);
    const index = insertionIndex(boxes, x, y);
    s.target = { kind: 'top', index };
    this.indicator = indicatorAt(boxes, index);
  }

  private onUp = (e: PointerEvent) => {
    const s = this.session;
    if (!s || e.pointerId !== s.pointerId) return;
    this.end(s.started);
  };

  private onCancel = () => this.end(false);

  private onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this.end(false);
  };

  private end(drop: boolean) {
    const s = this.session;
    if (!s) return;
    this.session = null;
    clearTimeout(s.timer);
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onCancel);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('touchmove', this.onTouchMove);
    s.ghost?.remove();
    s.el.removeAttribute('data-dnd-dragging');
    this.active = false;
    this.indicator = null;
    if (s.started) {
      const stop = (ev: MouseEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
      };
      window.addEventListener('click', stop, { capture: true, once: true });
      setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 0);
    }
    if (drop && s.target) this.onDrop(s.from, s.target);
  }
}
