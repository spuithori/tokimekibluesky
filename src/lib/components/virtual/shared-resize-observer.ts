type ResizeCallback = (entries: ResizeObserverEntry[]) => void;

const columnCallbacks = new Map<string, ResizeCallback>();
const elementToColumn = new Map<Element, string>();

let sharedObserver: ResizeObserver | null = null;

let columnIdCounter = 0;

function getSharedObserver(): ResizeObserver {
  if (!sharedObserver) {
    sharedObserver = new ResizeObserver((entries) => {
      const grouped = new Map<string, ResizeObserverEntry[]>();
      for (const entry of entries) {
        const columnId = elementToColumn.get(entry.target);
        if (!columnId) continue;
        let group = grouped.get(columnId);
        if (!group) {
          group = [];
          grouped.set(columnId, group);
        }
        group.push(entry);
      }
      for (const [columnId, columnEntries] of grouped) {
        const callback = columnCallbacks.get(columnId);
        if (callback) callback(columnEntries);
      }
    });
  }
  return sharedObserver;
}

export function generateColumnId(): string {
  return `vl-${++columnIdCounter}`;
}

export function registerColumn(columnId: string, callback: ResizeCallback): void {
  columnCallbacks.set(columnId, callback);
}

export function unregisterColumn(columnId: string): void {
  columnCallbacks.delete(columnId);
  for (const [el, col] of elementToColumn) {
    if (col === columnId) {
      sharedObserver?.unobserve(el);
      elementToColumn.delete(el);
    }
  }
  if (columnCallbacks.size === 0 && sharedObserver) {
    sharedObserver.disconnect();
    sharedObserver = null;
  }
}

export function observeElement(columnId: string, element: Element): void {
  elementToColumn.set(element, columnId);
  getSharedObserver().observe(element);
}

export function unobserveElement(element: Element): void {
  elementToColumn.delete(element);
  if (sharedObserver) sharedObserver.unobserve(element);
}
