import { describe, it, expect } from 'vitest';
import { classifyItemChange, type ClassifyContext } from './item-change-classifier';

function makeCtx(overrides: Partial<ClassifyContext> = {}): ClassifyContext {
  return {
    detectPrependShift: () => 0,
    getKeyAt: () => '',
    ...overrides,
  };
}

describe('classifyItemChange', () => {
  it('classifies empty list as clear', () => {
    expect(classifyItemChange(0, '', '', 10, 'a', 'z', makeCtx())).toEqual({ type: 'clear' });
  });

  it('classifies first population as initial', () => {
    expect(classifyItemChange(10, 'a', 'z', 0, '', '', makeCtx())).toEqual({ type: 'initial' });
  });

  it('classifies tail growth with stable first/last keys as append', () => {
    const ctx = makeCtx({ getKeyAt: (i) => (i === 9 ? 'z' : `k${i}`) });
    expect(classifyItemChange(15, 'a', 'z2', 10, 'a', 'z', ctx)).toEqual({ type: 'append', oldCount: 10 });
  });

  it('classifies identical boundaries and count as unchanged', () => {
    expect(classifyItemChange(10, 'a', 'z', 10, 'a', 'z', makeCtx())).toEqual({ type: 'unchanged' });
  });

  it('classifies same first key with different tail as generic', () => {
    expect(classifyItemChange(10, 'a', 'y', 10, 'a', 'z', makeCtx())).toEqual({ type: 'generic' });
    expect(classifyItemChange(8, 'a', 'z', 10, 'a', 'z', makeCtx())).toEqual({ type: 'generic' });
  });

  it('classifies same-length growth without matching old tail as generic', () => {
    const ctx = makeCtx({ getKeyAt: () => 'mismatch' });
    expect(classifyItemChange(15, 'a', 'w', 10, 'a', 'z', ctx)).toEqual({ type: 'generic' });
  });

  it('classifies detected shift as prepend', () => {
    const ctx = makeCtx({
      detectPrependShift: (first, prev) => (first === 'n' && prev === 'a' ? 5 : 0),
    });
    expect(classifyItemChange(15, 'n', 'z', 10, 'a', 'z', ctx)).toEqual({ type: 'prepend', shiftCount: 5 });
  });

  it('classifies missing shift with changed first key as prependFullReset', () => {
    const ctx = makeCtx({ detectPrependShift: () => 0 });
    expect(classifyItemChange(10, 'n', 'z', 10, 'a', 'z', ctx)).toEqual({ type: 'prependFullReset' });
  });

  it('classifies changed first key with empty old first key as generic', () => {
    expect(classifyItemChange(10, 'n', 'z', 10, '', 'z', makeCtx())).toEqual({ type: 'generic' });
  });
});
