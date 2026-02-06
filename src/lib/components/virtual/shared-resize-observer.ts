export type ResizeBatchCallback = (entries: ResizeObserverEntry[]) => void;

let sharedObserver: ResizeObserver | null = null;
const elementToOwner = new Map<Element, object>();
const ownerCallbacks = new Map<object, ResizeBatchCallback>();

function getSharedObserver(): ResizeObserver {
  if (!sharedObserver) {
    sharedObserver = new ResizeObserver((entries) => {
      const byOwner = new Map<object, ResizeObserverEntry[]>();
      for (const entry of entries) {
        const owner = elementToOwner.get(entry.target);
        if (!owner) continue;
        let group = byOwner.get(owner);
        if (!group) {
          group = [];
          byOwner.set(owner, group);
        }
        group.push(entry);
      }
      for (const [owner, ownerEntries] of byOwner) {
        const cb = ownerCallbacks.get(owner);
        if (cb) cb(ownerEntries);
      }
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
