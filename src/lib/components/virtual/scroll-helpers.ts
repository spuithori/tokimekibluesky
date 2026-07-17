export function resolveScrollContainer(
  parent: HTMLElement | undefined | null,
  isSingleColumn: boolean,
  isJunk: boolean,
  columnScrollElement?: HTMLElement | null,
): HTMLElement | null {
  if (!parent) return null;
  if (isSingleColumn) return document.documentElement;
  if (isJunk) return parent.closest('[data-junk-scroll], .modal-page-content') as HTMLElement | null;
  return columnScrollElement ?? null;
}

export function smoothScrollToTopGuarded(el: HTMLElement, onSettled?: () => void): void {
  const isRoot = el === document.documentElement || el === document.body;
  const target: EventTarget = isRoot ? window : el;
  const getSt = () => (isRoot ? window.scrollY : el.scrollTop);

  el.dataset.smoothScrolling = '';
  let done = false;
  const cleanup = () => {
    if (done) return;
    done = true;
    delete el.dataset.smoothScrolling;
    target.removeEventListener('scroll', onScroll);
    target.removeEventListener('scrollend', onEnd);
    onSettled?.();
  };
  const onScroll = () => {
    if (getSt() <= 5) cleanup();
  };
  const onEnd = () => cleanup();
  target.addEventListener('scroll', onScroll, { passive: true });
  target.addEventListener('scrollend', onEnd, { passive: true });

  let lastSt = getSt();
  const failsafe = () => {
    if (done) return;
    const st = getSt();
    if (st <= 5 || st === lastSt) {
      cleanup();
      return;
    }
    lastSt = st;
    setTimeout(failsafe, 1000);
  };
  setTimeout(failsafe, 3000);

  el.scroll({ top: 0, left: 0, behavior: 'smooth' });
}

export function getScrollTopFor(
  container: HTMLElement | null | undefined,
  isWindow: boolean,
): number {
  if (isWindow) return window.scrollY;
  return container?.scrollTop ?? 0;
}

export function setScrollTopFor(
  container: HTMLElement | null | undefined,
  isWindow: boolean,
  value: number,
): void {
  if (isWindow) {
    window.scrollTo(0, value);
  } else if (container) {
    container.scrollTop = value;
  }
}
