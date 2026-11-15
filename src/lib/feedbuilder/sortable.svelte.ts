import { tick as svelteTick } from 'svelte';

export interface SortableConfig {
  getIds: () => string[];

  onreorder: (next: string[]) => void;
}

type RowMetric = { id: string; el: HTMLElement; height: number };

const ROW_SELECTOR = '[data-sortable-row]';

export class Sortable {
  draggingId = $state<string | null>(null);

  private readonly config: SortableConfig;

  private listEl: HTMLElement | null = null;
  private dragRow: HTMLElement | null = null;
  private dragGhost: HTMLElement | null = null;
  private dragOffsetY = 0;
  private dragGhostLeft = 0;
  private dragLastPointerY = 0;
  private dragRowHeight = 0;
  private dragGap = 0;
  private dragRafId = 0;
  private dragSnapshot: string[] = [];
  private dragSourceIdx = -1;
  private dragTargetIdx = -1;
  private dragMetrics: RowMetric[] = [];

  private readonly handleCache = new Map<
    string,
    (el: HTMLElement) => () => void
  >();

  constructor(config: SortableConfig) {
    this.config = config;
  }

  readonly bindList = (el: HTMLElement): (() => void) => {
    this.listEl = el;
    return () => {
      if (this.listEl === el) this.listEl = null;
    };
  };

  readonly bindHandle = (id: string): ((el: HTMLElement) => () => void) => {
    let fn = this.handleCache.get(id);
    if (!fn) {
      fn = this.makeHandleAttachment(id);
      this.handleCache.set(id, fn);
    }
    return fn;
  };

  private readGap(): number {
    if (!this.listEl) return 0;
    const cs = window.getComputedStyle(this.listEl);
    const v = parseFloat(cs.rowGap || cs.gap || '0');
    return Number.isFinite(v) ? v : 0;
  }

  private applyGhost(): void {
    if (!this.dragGhost) return;
    this.dragGhost.style.left = `${this.dragGhostLeft}px`;
    this.dragGhost.style.top = `${this.dragLastPointerY - this.dragOffsetY}px`;
  }

  private applyShifts(): void {
    if (this.dragSourceIdx === -1 || this.dragTargetIdx === -1) return;
    const slot = this.dragRowHeight + this.dragGap;
    for (let i = 0; i < this.dragMetrics.length; i++) {
      const m = this.dragMetrics[i];
      if (m.id === this.draggingId) {
        m.el.style.transform = '';
        continue;
      }
      let shift = 0;
      if (this.dragSourceIdx < this.dragTargetIdx) {
        if (i > this.dragSourceIdx && i <= this.dragTargetIdx) shift = -slot;
      } else if (this.dragSourceIdx > this.dragTargetIdx) {
        if (i >= this.dragTargetIdx && i < this.dragSourceIdx) shift = slot;
      }
      m.el.style.transform = shift !== 0 ? `translateY(${shift}px)` : '';
    }
  }

  private recomputeDropTarget(): void {
    if (this.dragSourceIdx === -1 || this.dragMetrics.length === 0 || !this.listEl) {
      return;
    }
    const listRect = this.listEl.getBoundingClientRect();
    const myCenterFlow =
      this.dragLastPointerY -
      this.dragOffsetY +
      this.dragRowHeight / 2 -
      listRect.top;

    let target = this.dragSourceIdx;
    while (target + 1 < this.dragMetrics.length) {
      const next = this.dragMetrics[target + 1];
      const center = next.el.offsetTop + next.height / 2;
      if (myCenterFlow < center) break;
      target += 1;
    }
    while (target - 1 >= 0) {
      const prev = this.dragMetrics[target - 1];
      const center = prev.el.offsetTop + prev.height / 2;
      if (myCenterFlow > center) break;
      target -= 1;
    }
    this.dragTargetIdx = target;
  }

  private readonly tick = (): void => {
    this.dragRafId = 0;
    if (!this.draggingId || !this.dragGhost) return;
    this.applyGhost();
    this.recomputeDropTarget();
    this.applyShifts();
  };

  private buildGhost(source: HTMLElement): HTMLElement {
    const rect = source.getBoundingClientRect();
    const ghost = source.cloneNode(true) as HTMLElement;
    ghost.removeAttribute('data-sortable-row');
    ghost.removeAttribute('data-id');
    ghost.classList.add('sortable-ghost');
    ghost.style.position = 'fixed';
    ghost.style.left = `${rect.left}px`;
    ghost.style.top = `${rect.top}px`;
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    ghost.style.margin = '0';
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '9999';
    return ghost;
  }

  private async endDrag(commit: boolean): Promise<void> {
    if (this.dragRafId) {
      cancelAnimationFrame(this.dragRafId);
      this.dragRafId = 0;
    }

    let ghostFinalRect: DOMRect | null = null;
    if (this.dragGhost) {
      ghostFinalRect = this.dragGhost.getBoundingClientRect();
      this.dragGhost.remove();
      this.dragGhost = null;
    }
    document.body.style.userSelect = '';

    const sourceId = this.draggingId;
    const sourceIdx = this.dragSourceIdx;
    const target = this.dragTargetIdx;
    const snapshot = this.dragSnapshot;
    const metrics = this.dragMetrics;
    const list = this.listEl;
    const dragRow = this.dragRow;

    this.draggingId = null;
    this.dragSnapshot = [];
    this.dragSourceIdx = -1;
    this.dragTargetIdx = -1;
    this.dragMetrics = [];
    this.dragRow = null;

    const reorder =
      commit &&
      sourceId !== null &&
      sourceIdx !== -1 &&
      target !== -1 &&
      target !== sourceIdx;

    if (!reorder) {
      for (const m of metrics) m.el.style.transform = '';
      if (dragRow) dragRow.style.visibility = '';
      return;
    }

    if (!list || !dragRow) return;

    const oldRects = new Map<string, DOMRect>();
    for (const m of metrics) {
      if (m.id === sourceId && ghostFinalRect) {
        oldRects.set(m.id, ghostFinalRect);
      } else {
        oldRects.set(m.id, m.el.getBoundingClientRect());
      }
    }

    dragRow.style.visibility = '';

    for (const m of metrics) {
      m.el.style.transition = 'none';
      m.el.style.transform = '';
    }
    void list.offsetHeight;

    const next = snapshot.slice();
    const [moved] = next.splice(sourceIdx, 1);
    next.splice(target, 0, moved);
    this.config.onreorder(next);

    await svelteTick();

    const newItems = Array.from(
      list.querySelectorAll<HTMLElement>(ROW_SELECTOR)
    );
    const inverted: HTMLElement[] = [];
    for (const el of newItems) {
      const id = el.dataset.id;
      if (!id) continue;
      const oldRect = oldRects.get(id);
      if (!oldRect) continue;
      const newRect = el.getBoundingClientRect();
      const dx = oldRect.left - newRect.left;
      const dy = oldRect.top - newRect.top;
      if (dx === 0 && dy === 0) {
        el.style.transition = '';
        el.style.transform = '';
        continue;
      }
      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      inverted.push(el);
    }
    void list.offsetHeight;

    requestAnimationFrame(() => {
      for (const el of inverted) {
        el.style.transition = '';
        el.style.transform = '';
      }
    });
  }

  private moveBy(id: string, delta: number): void {
    const ids = this.config.getIds();
    const i = ids.indexOf(id);
    if (i === -1) return;
    const j = i + delta;
    if (j < 0 || j >= ids.length) return;
    const next = ids.slice();
    [next[i], next[j]] = [next[j], next[i]];
    this.config.onreorder(next);
  }

  private makeHandleAttachment(id: string) {
    return (handle: HTMLElement): (() => void) => {
      const onPointerDown = (ev: PointerEvent): void => {
        if (ev.button !== 0) return;
        const closest = handle.closest<HTMLElement>(ROW_SELECTOR);
        if (!closest || !this.listEl) return;
        const ids = this.config.getIds();
        const idx = ids.indexOf(id);
        if (idx === -1) return;
        ev.preventDefault();

        const rect = closest.getBoundingClientRect();
        this.dragRow = closest;
        this.dragOffsetY = ev.clientY - rect.top;
        this.dragLastPointerY = ev.clientY;
        this.dragRowHeight = rect.height;
        this.dragGhostLeft = rect.left;
        this.dragGap = this.readGap();
        this.dragSnapshot = ids.slice();
        this.dragSourceIdx = idx;
        this.dragTargetIdx = idx;

        const items = Array.from(
          this.listEl.querySelectorAll<HTMLElement>(ROW_SELECTOR)
        );
        this.dragMetrics = [];
        for (let i = 0; i < this.dragSnapshot.length; i++) {
          const wantedId = this.dragSnapshot[i];
          const el = items.find((e) => e.dataset.id === wantedId);
          if (!el) continue;
          this.dragMetrics.push({
            id: wantedId,
            el,
            height: el.offsetHeight
          });
        }

        this.dragGhost = this.buildGhost(closest);
        document.body.appendChild(this.dragGhost);
        closest.style.visibility = 'hidden';
        document.body.style.userSelect = 'none';

        this.draggingId = id;

        try {
          handle.setPointerCapture(ev.pointerId);
        } catch {
        }
      };

      const onPointerMove = (ev: PointerEvent): void => {
        if (this.draggingId !== id) return;
        this.dragLastPointerY = ev.clientY;
        if (this.dragRafId) return;
        this.dragRafId = requestAnimationFrame(this.tick);
      };

      const onPointerUp = (ev: PointerEvent): void => {
        if (this.draggingId !== id) return;
        try {
          handle.releasePointerCapture(ev.pointerId);
        } catch {
        }
        void this.endDrag(true);
      };

      const onPointerCancel = (ev: PointerEvent): void => {
        if (this.draggingId !== id) return;
        try {
          handle.releasePointerCapture(ev.pointerId);
        } catch {
        }
        void this.endDrag(false);
      };

      const onKey = (ev: KeyboardEvent): void => {
        if (ev.key === 'ArrowUp') {
          ev.preventDefault();
          this.moveBy(id, -1);
        } else if (ev.key === 'ArrowDown') {
          ev.preventDefault();
          this.moveBy(id, 1);
        }
      };

      handle.addEventListener('pointerdown', onPointerDown);
      handle.addEventListener('pointermove', onPointerMove);
      handle.addEventListener('pointerup', onPointerUp);
      handle.addEventListener('pointercancel', onPointerCancel);
      handle.addEventListener('keydown', onKey);

      return () => {
        handle.removeEventListener('pointerdown', onPointerDown);
        handle.removeEventListener('pointermove', onPointerMove);
        handle.removeEventListener('pointerup', onPointerUp);
        handle.removeEventListener('pointercancel', onPointerCancel);
        handle.removeEventListener('keydown', onKey);
      };
    };
  }
}
