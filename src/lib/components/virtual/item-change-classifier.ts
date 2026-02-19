export type ItemChangeType =
  | { type: 'clear' }
  | { type: 'quickPrepend' }
  | { type: 'initial' }
  | { type: 'append'; oldCount: number }
  | { type: 'unchanged' }
  | { type: 'prependWithAnchor'; shiftCount: number }
  | { type: 'prependSimple'; shiftCount: number }
  | { type: 'prependFullReset' }
  | { type: 'generic' };

export interface ClassifyContext {
  quickPrependHandled: boolean;
  cachedPrependShift: number;
  hasScrollContainer: boolean;
  hasPendingPrependAnchor: boolean;
  detectPrependShift: (firstKey: string, prevKey: string) => number;
  getKeyAt: (index: number) => string;
}

export function classifyItemChange(
  len: number, firstKey: string, lastKey: string,
  oldCount: number, oldFirstKey: string, oldLastKey: string,
  ctx: ClassifyContext,
): ItemChangeType {
  if (len === 0) return { type: 'clear' };
  if (ctx.quickPrependHandled) return { type: 'quickPrepend' };
  if (oldCount === 0) return { type: 'initial' };

  if (firstKey === oldFirstKey) {
    if (len > oldCount && oldLastKey && ctx.getKeyAt(oldCount - 1) === oldLastKey) {
      return { type: 'append', oldCount };
    }
    if (len === oldCount && lastKey === oldLastKey) return { type: 'unchanged' };
    return { type: 'generic' };
  }

  if (oldFirstKey && firstKey !== oldFirstKey) {
    const shiftCount = ctx.cachedPrependShift > 0
      ? ctx.cachedPrependShift
      : ctx.detectPrependShift(firstKey, oldFirstKey);
    if (shiftCount > 0 && ctx.hasScrollContainer && ctx.hasPendingPrependAnchor) {
      return { type: 'prependWithAnchor', shiftCount };
    }
    if (shiftCount > 0) return { type: 'prependSimple', shiftCount };
    return { type: 'prependFullReset' };
  }

  return { type: 'generic' };
}
