import { CUSTOM_FEED_DEFS } from '$lib/feedbuilder/types';
import type { CustomFeedFilterGroup, CustomFeedPredicate } from '$lib/feedbuilder/types';

export type NegatedPredicate = { kind: 'not'; item: CustomFeedPredicate };

export type FilterLeaf = CustomFeedPredicate | NegatedPredicate;

export type PredicateOrGroup = FilterLeaf | { kind: 'or'; items: FilterLeaf[] };

export function isOrGroup(node: PredicateOrGroup): node is { kind: 'or'; items: FilterLeaf[] } {
  return (node as { kind?: string }).kind === 'or';
}

export function isNegated(leaf: FilterLeaf): leaf is NegatedPredicate {
  return (leaf as { kind?: string }).kind === 'not';
}

export function leafPred(leaf: FilterLeaf): CustomFeedPredicate {
  return isNegated(leaf) ? leaf.item : leaf;
}

export function makeLeaf(p: CustomFeedPredicate, negated: boolean): FilterLeaf {
  return negated ? { kind: 'not', item: p } : p;
}

type FilterNode = CustomFeedFilterGroup | CustomFeedPredicate;

function leafToNode(leaf: FilterLeaf): FilterNode {
  return isNegated(leaf)
    ? { $type: CUSTOM_FEED_DEFS.filterGroup, op: 'not', items: [leaf.item] }
    : leaf;
}

export function predicatesToFilter(preds: PredicateOrGroup[]): CustomFeedFilterGroup | undefined {
  if (preds.length === 0) return undefined;
  return {
    $type: CUSTOM_FEED_DEFS.filterGroup,
    op: 'and',
    items: preds.map((node) =>
      isOrGroup(node)
        ? { $type: CUSTOM_FEED_DEFS.filterGroup, op: 'or', items: node.items.map(leafToNode) }
        : leafToNode(node)
    )
  };
}

function isGroup(n: FilterNode): n is CustomFeedFilterGroup {
  return n.$type === CUSTOM_FEED_DEFS.filterGroup;
}

function nodeToLeaf(n: FilterNode): FilterLeaf | null {
  if (!isGroup(n)) return n;
  if (n.op === 'not' && n.items.length === 1 && !isGroup(n.items[0])) {
    return { kind: 'not', item: n.items[0] };
  }
  return null;
}

export function filterToPredicates(filter: FilterNode | undefined): PredicateOrGroup[] | null {
  if (!filter) return [];
  if (!isGroup(filter)) return [filter];
  if (filter.op !== 'and') return null;
  const out: PredicateOrGroup[] = [];
  for (const item of filter.items) {
    if (isGroup(item) && item.op === 'or') {
      const leaves: FilterLeaf[] = [];
      for (const inner of item.items) {
        const leaf = nodeToLeaf(inner);
        if (!leaf) return null;
        leaves.push(leaf);
      }
      out.push({ kind: 'or', items: leaves });
    } else {
      const leaf = nodeToLeaf(item);
      if (!leaf) return null;
      out.push(leaf);
    }
  }
  return out;
}

export function excludedAuthorIndex(preds: PredicateOrGroup[], did: string): number {
  return preds.findIndex(
    (n) => !isOrGroup(n) && isNegated(n) && n.item.$type === CUSTOM_FEED_DEFS.predicateAuthor && n.item.did === did
  );
}

export function excludeAuthorLeaf(did: string): FilterLeaf {
  return { kind: 'not', item: { $type: CUSTOM_FEED_DEFS.predicateAuthor, did } };
}

export type NodeAddr = { group: number; child?: number };

export type DropTarget = { kind: 'top'; index: number } | { kind: 'group'; group: number; index: number };

function tidyGroup(items: FilterLeaf[]): PredicateOrGroup | null {
  if (items.length === 0) return null;
  if (items.length === 1) return items[0];
  return { kind: 'or', items };
}

export function moveNode(preds: PredicateOrGroup[], from: NodeAddr, to: DropTarget): PredicateOrGroup[] | null {
  const src = preds[from.group];
  if (!src) return null;

  if (from.child !== undefined && to.kind === 'group' && to.group === from.group) {
    if (!isOrGroup(src) || !src.items[from.child]) return null;
    const items = [...src.items];
    const [moved] = items.splice(from.child, 1);
    const at = to.index > from.child ? to.index - 1 : to.index;
    items.splice(Math.min(Math.max(at, 0), items.length), 0, moved);
    const next = [...preds];
    next[from.group] = { kind: 'or', items };
    return next;
  }

  let moving: PredicateOrGroup;
  let next = [...preds];

  let removedTop = false;
  if (from.child === undefined) {
    moving = src;
    if (isOrGroup(moving) && to.kind === 'group') return null;
    next.splice(from.group, 1);
    removedTop = true;
  } else {
    if (!isOrGroup(src) || !src.items[from.child]) return null;
    moving = src.items[from.child];
    const rest = tidyGroup(src.items.filter((_, i) => i !== from.child));
    if (rest === null) {
      next.splice(from.group, 1);
      removedTop = true;
    } else {
      next[from.group] = rest;
    }
  }
  const shift = (i: number) => (removedTop && i > from.group ? i - 1 : i);

  if (to.kind === 'top') {
    const at = Math.min(Math.max(shift(to.index), 0), next.length);
    next.splice(at, 0, moving);
    return next;
  }
  const gi = shift(to.group);
  const target = next[gi];
  if (!target || !isOrGroup(target) || isOrGroup(moving)) return null;
  const items = [...target.items];
  items.splice(Math.min(Math.max(to.index, 0), items.length), 0, moving);
  next = [...next];
  next[gi] = { kind: 'or', items };
  return next;
}
