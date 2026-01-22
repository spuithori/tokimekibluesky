export function binarySearchStart(positions: number[], target: number): number {
  let left = 0;
  let right = positions.length;

  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (positions[mid] < target) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  return Math.max(0, left - 1);
}

export function binarySearchEnd(
  positions: number[],
  heights: Map<string, number>,
  items: any[],
  getKey: (item: any, index: number) => string,
  target: number,
  defaultHeight: number
): number {
  let left = 0;
  let right = positions.length;

  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    const itemHeight = heights.get(getKey(items[mid], mid)) ?? defaultHeight;
    const itemBottom = positions[mid] + itemHeight;

    if (itemBottom <= target) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  return Math.min(items.length, left + 1);
}

export function calculatePositions(
  items: any[],
  heights: Map<string, number>,
  getKey: (item: any, index: number) => string,
  defaultHeight: number
): number[] {
  const positions: number[] = [];
  let cumulative = 0;

  for (let i = 0; i < items.length; i++) {
    positions.push(cumulative);
    const key = getKey(items[i], i);
    const height = heights.get(key) ?? defaultHeight;
    cumulative += height;
  }

  return positions;
}

export function calculateTotalHeight(
  items: any[],
  positions: number[],
  heights: Map<string, number>,
  getKey: (item: any, index: number) => string,
  defaultHeight: number
): number {
  if (items.length === 0) return 0;

  const lastIndex = items.length - 1;
  const lastPosition = positions[lastIndex] ?? 0;
  const lastHeight = heights.get(getKey(items[lastIndex], lastIndex)) ?? defaultHeight;

  return lastPosition + lastHeight;
}
