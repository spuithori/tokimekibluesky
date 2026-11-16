import { CUSTOM_FEED_DEFS } from '$lib/feedbuilder/types';
import type { CustomFeedFilterGroup, CustomFeedPredicate } from '$lib/feedbuilder/types';

export type NegatedPredicate = { kind: 'not'; item: CustomFeedPredicate };

export type FilterLeaf = CustomFeedPredicate | NegatedPredicate;

export type AndGroup = { kind: 'and'; items: FilterLeaf[] };

export type OrItem = FilterLeaf | AndGroup;

export type OrGroup = { kind: 'or'; items: OrItem[] };

export type PredicateOrGroup = FilterLeaf | OrGroup;

export function isOrGroup(node: PredicateOrGroup | OrItem): node is OrGroup {
  return (node as { kind?: string }).kind === 'or';
}

export function isAndGroup(node: PredicateOrGroup | OrItem): node is AndGroup {
  return (node as { kind?: string }).kind === 'and';
}

export function itemLeaves(item: OrItem): FilterLeaf[] {
  return isAndGroup(item) ? item.items : [item];
}

export function leavesOf(node: PredicateOrGroup): FilterLeaf[] {
  return isOrGroup(node) ? node.items.flatMap(itemLeaves) : [node];
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

function orItemToNodes(item: OrItem): FilterNode[] {
  if (!isAndGroup(item)) return [leafToNode(item)];
  if (item.items.length <= 1) return item.items.map(leafToNode);
  return [{ $type: CUSTOM_FEED_DEFS.filterGroup, op: 'and', items: item.items.map(leafToNode) }];
}

export function predicatesToFilter(preds: PredicateOrGroup[]): CustomFeedFilterGroup | undefined {
  if (preds.length === 0) return undefined;
  return {
    $type: CUSTOM_FEED_DEFS.filterGroup,
    op: 'and',
    items: preds.map((node) =>
      isOrGroup(node)
        ? { $type: CUSTOM_FEED_DEFS.filterGroup, op: 'or', items: node.items.flatMap(orItemToNodes) }
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

function nodeToOrItem(n: FilterNode): OrItem | null {
  if (!isGroup(n) || n.op !== 'and') return nodeToLeaf(n);
  const leaves: FilterLeaf[] = [];
  for (const inner of n.items) {
    const leaf = nodeToLeaf(inner);
    if (!leaf) return null;
    leaves.push(leaf);
  }
  if (leaves.length === 0) return null;
  return leaves.length === 1 ? leaves[0] : { kind: 'and', items: leaves };
}

function nodeToOrGroup(n: CustomFeedFilterGroup): OrGroup | null {
  const items: OrItem[] = [];
  for (const inner of n.items) {
    const item = nodeToOrItem(inner);
    if (!item) return null;
    items.push(item);
  }
  return { kind: 'or', items };
}

export function filterToPredicates(filter: FilterNode | undefined): PredicateOrGroup[] | null {
  if (!filter) return [];
  if (!isGroup(filter)) return [filter];
  if (filter.op === 'or') {
    const group = nodeToOrGroup(filter);
    return group && group.items.length > 0 ? [group] : null;
  }
  if (filter.op !== 'and') return null;
  const out: PredicateOrGroup[] = [];
  for (const item of filter.items) {
    if (isGroup(item) && item.op === 'or') {
      const group = nodeToOrGroup(item);
      if (!group) return null;
      out.push(group);
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

export type NodeAddr = { group: number; child?: number; sub?: number };

export type DropTarget =
  | { kind: 'top'; index: number }
  | { kind: 'group'; group: number; index: number }
  | { kind: 'and'; group: number; child: number; index: number };

type AnyNode = FilterLeaf | AndGroup | OrGroup;

export function nodeAt(preds: PredicateOrGroup[], addr: NodeAddr): AnyNode | undefined {
  const top = preds[addr.group];
  if (!top) return undefined;
  if (addr.child === undefined) return addr.sub === undefined ? top : undefined;
  if (!isOrGroup(top)) return undefined;
  const item = top.items[addr.child];
  if (!item || addr.sub === undefined) return item;
  return isAndGroup(item) ? item.items[addr.sub] : undefined;
}

function replaceAt(preds: PredicateOrGroup[], addr: NodeAddr, node: AnyNode): PredicateOrGroup[] | null {
  if (nodeAt(preds, addr) === undefined) return null;
  const next = [...preds];
  if (addr.child === undefined) {
    next[addr.group] = node as PredicateOrGroup;
    return next;
  }
  const top = preds[addr.group] as OrGroup;
  const items = [...top.items];
  if (addr.sub === undefined) {
    items[addr.child] = node as OrItem;
  } else {
    const and = items[addr.child] as AndGroup;
    const leaves = [...and.items];
    leaves[addr.sub] = node as FilterLeaf;
    items[addr.child] = { kind: 'and', items: leaves };
  }
  next[addr.group] = { kind: 'or', items };
  return next;
}

const HOLE = { kind: 'hole' } as unknown as FilterLeaf;

function dropHole(preds: PredicateOrGroup[]): PredicateOrGroup[] {
  const out: PredicateOrGroup[] = [];
  for (const node of preds) {
    if (node === HOLE) continue;
    if (!isOrGroup(node)) {
      out.push(node);
      continue;
    }
    let touched = false;
    const items: OrItem[] = [];
    for (const item of node.items) {
      if (item === HOLE) {
        touched = true;
      } else if (isAndGroup(item) && item.items.includes(HOLE)) {
        touched = true;
        const rest = item.items.filter((l) => l !== HOLE);
        if (rest.length >= 2) items.push({ kind: 'and', items: rest });
        else items.push(...rest);
      } else {
        items.push(item);
      }
    }
    if (!touched) out.push(node);
    else if (items.length >= 2) out.push({ kind: 'or', items });
    else out.push(...items.flatMap(itemLeaves));
  }
  return out;
}

export function setLeafAt(preds: PredicateOrGroup[], addr: NodeAddr, leaf: FilterLeaf): PredicateOrGroup[] {
  const cur = nodeAt(preds, addr);
  if (!cur || isOrGroup(cur) || isAndGroup(cur)) return preds;
  return replaceAt(preds, addr, leaf) ?? preds;
}

export function removeAt(preds: PredicateOrGroup[], addr: NodeAddr): PredicateOrGroup[] {
  const holed = replaceAt(preds, addr, HOLE);
  return holed ? dropHole(holed) : preds;
}

export function addAnd(preds: PredicateOrGroup[], group: number, child: number, leaf: FilterLeaf): PredicateOrGroup[] {
  const cur = nodeAt(preds, { group, child });
  if (!cur || isOrGroup(cur)) return preds;
  const items = isAndGroup(cur) ? [...cur.items, leaf] : [cur, leaf];
  return replaceAt(preds, { group, child }, { kind: 'and', items }) ?? preds;
}

function clamp(i: number, n: number): number {
  return Math.min(Math.max(i, 0), n);
}

function insertAt(preds: PredicateOrGroup[], to: DropTarget, moving: AnyNode): PredicateOrGroup[] | null {
  if (to.kind === 'top') {
    const nodes: PredicateOrGroup[] = isAndGroup(moving) ? moving.items : [moving];
    const next = [...preds];
    next.splice(clamp(to.index, next.length), 0, ...nodes);
    return next;
  }
  const target = preds[to.group];
  if (!target || !isOrGroup(target) || isOrGroup(moving)) return null;
  const items = [...target.items];
  if (to.kind === 'group') {
    items.splice(clamp(to.index, items.length), 0, moving);
  } else {
    const and = items[to.child];
    if (!and || !isAndGroup(and) || isAndGroup(moving)) return null;
    const leaves = [...and.items];
    leaves.splice(clamp(to.index, leaves.length), 0, moving);
    items[to.child] = { kind: 'and', items: leaves };
  }
  const next = [...preds];
  next[to.group] = { kind: 'or', items };
  return next;
}

export function moveNode(preds: PredicateOrGroup[], from: NodeAddr, to: DropTarget): PredicateOrGroup[] | null {
  const moving = nodeAt(preds, from);
  if (!moving) return null;
  const holed = replaceAt(preds, from, HOLE);
  const placed = holed && insertAt(holed, to, moving);
  return placed ? dropHole(placed) : null;
}
