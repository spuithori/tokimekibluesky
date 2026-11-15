export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

export function motionMs(ms: number): number {
  return prefersReducedMotion() ? 0 : ms;
}
