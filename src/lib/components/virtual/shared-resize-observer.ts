export type ResizeBatchCallback = (entries: ResizeObserverEntry[]) => void;

let sharedObserver: ResizeObserver | null = null;
const elementToOwner = new Map<Element, object>();
const ownerCallbacks = new Map<object, ResizeBatchCallback>();
const _byOwner = new Map<object, ResizeObserverEntry[]>();
const _entryPool: ResizeObserverEntry[][] = [];

function getSharedObserver(): ResizeObserver {
  if (!sharedObserver) {
    sharedObserver = new ResizeObserver((entries) => {
      if (ownerCallbacks.size === 0) return;

      if (ownerCallbacks.size === 1) {
        const cb = ownerCallbacks.values().next().value!;
        cb(entries);
        return;
      }

      for (const entry of entries) {
        const owner = elementToOwner.get(entry.target);
        if (!owner) continue;
        let group = _byOwner.get(owner);
        if (!group) {
          group = _entryPool.pop() ?? [];
          _byOwner.set(owner, group);
        }
        group.push(entry);
      }
      for (const [owner, ownerEntries] of _byOwner) {
        const cb = ownerCallbacks.get(owner);
        if (cb) cb(ownerEntries);
        ownerEntries.length = 0;
        _entryPool.push(ownerEntries);
      }
      _byOwner.clear();
    });
  }
  return sharedObserver;
}

export function createResizeOwner(callback: ResizeBatchCallback): object {
  const token = {};
  ownerCallbacks.set(token, callback);
  return token;
}

export function destroyResizeOwner(token: object): void {
  ownerCallbacks.delete(token);
}

export function observeResize(element: Element, owner: object): void {
  elementToOwner.set(element, owner);
  getSharedObserver().observe(element);
}

export function unobserveResize(element: Element): void {
  elementToOwner.delete(element);
  if (sharedObserver) {
    sharedObserver.unobserve(element);
  }
}
