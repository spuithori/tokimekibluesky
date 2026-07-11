export interface VlProbeContext {
  getScrollTop(): number;
  getHeaderBottom(): number;
  getListRoot(): HTMLElement | null;
  snapshot(): Record<string, unknown>;
}

export function startVlProbe(ctx: VlProbeContext): (() => void) | null {
  if (typeof window === 'undefined') return null;
  try {
    if (localStorage.getItem('vlProbe') !== '1') return null;
  } catch {
    return null;
  }

  const log: unknown[] = ((window as any).__vlJumpLog ??= []);
  let running = true;
  let prevId = '';
  let prevY: number | null = null;
  let prevSt = 0;
  let prevOnScreen = false;
  let lastInput = 0;

  const onInput = () => { lastInput = performance.now(); };
  const inputEvents = ['wheel', 'touchmove', 'touchstart', 'keydown', 'pointerdown', 'mousedown'];
  for (const ev of inputEvents) {
    window.addEventListener(ev, onInput, { passive: true, capture: true });
  }

  const record = (kind: string, extra: Record<string, unknown>) => {
    const entry = {
      t: Math.round(performance.now()),
      kind,
      idleMs: Math.round(performance.now() - lastInput),
      ...extra,
      ...ctx.snapshot(),
    };
    log.push(entry);
    if (log.length > 100) log.shift();
    if (kind !== 'neutral') {
      console.warn('[vlProbe]', JSON.stringify(entry));
    }
  };

  const loop = () => {
    if (!running) return;
    const root = ctx.getListRoot();
    if (root) {
      const headerBottom = ctx.getHeaderBottom();
      const st = ctx.getScrollTop();

      if (prevId) {
        const tracked = root.querySelector(`[data-virtual-key="${CSS.escape(prevId)}"]`);
        if (tracked) {
          const y = tracked.getBoundingClientRect().top;
          if (prevY != null) {
            const dy = y - prevY;
            const dst = st - prevSt;
            const scrollMismatch = Math.abs(dy + dst);
            const visualMove = Math.abs(dy);
            const idle = performance.now() - lastInput > 150;
            const base = {
              dy: Math.round(dy * 10) / 10,
              dst: Math.round(dst * 10) / 10,
              anchor: prevId.slice(0, 60),
            };
            if (idle && visualMove > 3) {
              record('visual-idle', base);
            } else if (!idle && scrollMismatch > 6 && visualMove > 3) {
              record('visual-scroll', base);
            } else if (scrollMismatch > 6) {
              record('neutral', base);
            }
          }
        } else if (prevOnScreen) {
          record('anchor-lost', { anchor: prevId.slice(0, 60), dst: Math.round((st - prevSt) * 10) / 10 });
        }
      }

      prevId = '';
      prevY = null;
      prevOnScreen = false;
      for (const el of root.querySelectorAll('.virtual-item')) {
        const r = el.getBoundingClientRect();
        if (r.bottom > headerBottom + 1) {
          prevId = (el as HTMLElement).dataset.virtualKey ?? '';
          prevY = r.top;
          prevOnScreen = r.top < window.innerHeight;
          break;
        }
      }
      prevSt = st;
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  return () => {
    running = false;
    for (const ev of inputEvents) {
      window.removeEventListener(ev, onInput, { capture: true } as EventListenerOptions);
    }
  };
}
