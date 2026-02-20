export class FenwickTree {
  private _tree: Float64Array;
  private _data: Float64Array;
  private _measured: Uint8Array;
  private _size: number;
  private _capacity: number;
  private _total: number;
  private _measuredCount: number;
  private _totalMeasured: number;

  constructor() {
    this._tree = new Float64Array(0);
    this._data = new Float64Array(0);
    this._measured = new Uint8Array(0);
    this._size = 0;
    this._capacity = 0;
    this._total = 0;
    this._measuredCount = 0;
    this._totalMeasured = 0;
  }

  get length(): number {
    return this._size;
  }

  get total(): number {
    return this._total;
  }

  get measuredCount(): number {
    return this._measuredCount;
  }

  get measuredAverage(): number {
    return this._measuredCount > 0 ? this._totalMeasured / this._measuredCount : 0;
  }

  isMeasured(index: number): boolean {
    if (index < 0 || index >= this._size) return false;
    return this._measured[index + 1] === 1;
  }

  setMeasured(index: number, height: number): void {
    if (index < 0 || index >= this._size) return;
    const i1 = index + 1;
    const oldHeight = this._data[i1];
    const wasMeasured = this._measured[i1];

    // Update tree
    const delta = height - oldHeight;
    if (delta !== 0) {
      this._data[i1] = height;
      this._total += delta;
      let k = i1;
      while (k <= this._size) {
        this._tree[k] += delta;
        k += k & -k;
      }
    }

    // Update measured tracking
    if (wasMeasured) {
      this._totalMeasured += delta;
    } else {
      this._measured[i1] = 1;
      this._measuredCount++;
      this._totalMeasured += height;
    }
  }

  clearMeasured(): void {
    if (this._size > 0) {
      this._measured.fill(0, 0, this._size + 1);
    }
    this._measuredCount = 0;
    this._totalMeasured = 0;
  }

  buildFrom(heights: number[]): void {
    this.buildWithCallback(heights.length, (i) => heights[i]);
  }

  buildWithCallback(n: number, getHeight: (index: number) => number): void {
    this._size = n;
    this._measuredCount = 0;
    this._totalMeasured = 0;

    if (n === 0) {
      this._total = 0;
      return;
    }

    if (n > this._capacity) {
      const newCap = Math.max(this._capacity + Math.ceil(this._capacity * 0.5), n, 64);
      this._data = new Float64Array(newCap + 1);
      this._tree = new Float64Array(newCap + 1);
      this._measured = new Uint8Array(newCap + 1);
      this._capacity = newCap;
    } else {
      this._measured.fill(0, 0, n + 1);
    }

    let total = 0;
    for (let i = 0; i < n; i++) {
      const i1 = i + 1;
      const h = getHeight(i);
      this._data[i1] = h;
      this._tree[i1] = h;
      total += h;
    }

    for (let i = 1; i <= n; i++) {
      const parent = i + (i & -i);
      if (parent <= n) {
        this._tree[parent] += this._tree[i];
      }
    }

    this._total = total;
  }

  /** Build with callback, marking specific indices as measured */
  buildWithMeasured(n: number, getHeight: (index: number) => number, isMeasuredFn: (index: number) => boolean): void {
    this.buildWithCallback(n, getHeight);
    for (let i = 0; i < n; i++) {
      if (isMeasuredFn(i)) {
        const i1 = i + 1;
        this._measured[i1] = 1;
        this._measuredCount++;
        this._totalMeasured += this._data[i1];
      }
    }
  }

  prefixSum(count: number): number {
    if (count <= 0) return 0;
    if (count >= this._size) return this._total;

    let sum = 0;
    let i = count;
    while (i > 0) {
      sum += this._tree[i];
      i -= i & -i;
    }
    return sum;
  }

  set(index: number, height: number): void {
    if (index < 0 || index >= this._size) return;
    const i1 = index + 1;

    const delta = height - this._data[i1];
    if (delta === 0) return;
    this._data[i1] = height;
    this._total += delta;

    let k = i1;
    while (k <= this._size) {
      this._tree[k] += delta;
      k += k & -k;
    }
  }

  get(index: number): number {
    if (index < 0 || index >= this._size) return 0;
    return this._data[index + 1];
  }

  findIndex(target: number): number {
    if (this._size === 0) return 0;
    if (target <= 0) return 0;

    let idx = 0;
    let remaining = target;

    let bit = 1;
    while (bit <= this._size) bit <<= 1;
    bit >>= 1;

    while (bit > 0) {
      const next = idx + bit;
      if (next <= this._size) {
        if (this._tree[next] <= remaining) {
          remaining -= this._tree[next];
          idx = next;
        }
      }
      bit >>= 1;
    }

    return Math.min(idx, this._size - 1);
  }

  prependWithCallback(count: number, getHeight: (index: number) => number): void {
    if (count === 0) return;

    const oldSize = this._size;
    const newSize = oldSize + count;

    if (newSize > this._capacity) {
      const newCap = Math.max(this._capacity + Math.ceil(this._capacity * 0.5), newSize, 64);
      const newData = new Float64Array(newCap + 1);
      const newTree = new Float64Array(newCap + 1);
      const newMeasured = new Uint8Array(newCap + 1);
      // Copy old data to shifted positions
      for (let i = 1; i <= oldSize; i++) {
        newData[count + i] = this._data[i];
        newMeasured[count + i] = this._measured[i];
      }
      this._data = newData;
      this._tree = newTree;
      this._measured = newMeasured;
      this._capacity = newCap;
    } else {
      // Shift existing data in-place (backwards to avoid overwriting)
      for (let i = oldSize; i >= 1; i--) {
        this._data[count + i] = this._data[i];
        this._measured[count + i] = this._measured[i];
      }
      // Clear new positions
      for (let i = 1; i <= count; i++) {
        this._measured[i] = 0;
      }
    }

    // Fill prepended positions
    let prependTotal = 0;
    for (let i = 0; i < count; i++) {
      const h = getHeight(i);
      this._data[i + 1] = h;
      prependTotal += h;
    }

    this._size = newSize;

    // Rebuild tree structure from _data
    for (let i = 1; i <= newSize; i++) {
      this._tree[i] = this._data[i];
    }
    for (let i = 1; i <= newSize; i++) {
      const parent = i + (i & -i);
      if (parent <= newSize) {
        this._tree[parent] += this._tree[i];
      }
    }

    this._total += prependTotal;
  }

  extend(newHeights: number[]): void {
    this.extendWithCallback(newHeights.length, (i) => newHeights[i]);
  }

  extendWithCallback(count: number, getHeight: (index: number) => number): void {
    if (count === 0) return;

    const oldSize = this._size;
    const newSize = oldSize + count;

    if (newSize > this._capacity) {
      const newCap = Math.max(this._capacity + Math.ceil(this._capacity * 0.5), newSize, 64);
      const newData = new Float64Array(newCap + 1);
      newData.set(this._data.subarray(0, oldSize + 1));
      this._data = newData;

      const newTree = new Float64Array(newCap + 1);
      newTree.set(this._tree.subarray(0, oldSize + 1));
      this._tree = newTree;

      const newMeasured = new Uint8Array(newCap + 1);
      newMeasured.set(this._measured.subarray(0, oldSize + 1));
      this._measured = newMeasured;
      this._capacity = newCap;
    }

    let addedTotal = 0;
    for (let i = 0; i < count; i++) {
      const h = getHeight(i);
      this._data[oldSize + i + 1] = h;
      this._measured[oldSize + i + 1] = 0;
      addedTotal += h;
    }
    this._size = newSize;

    for (let j = oldSize + 1; j <= newSize; j++) {
      this._tree[j] = this._data[j];
    }

    let b = oldSize;
    while (b >= 1) {
      const parent = b + (b & -b);
      if (parent <= newSize) {
        this._tree[parent] += this._tree[b];
      }
      b -= (b & -b);
    }

    for (let j = oldSize + 1; j <= newSize; j++) {
      const parent = j + (j & -j);
      if (parent <= newSize) {
        this._tree[parent] += this._tree[j];
      }
    }

    this._total += addedTotal;
  }

  /** Update all unmeasured items to newAvg and rebuild the Fenwick tree structure */
  rebuildWithAverage(avg: number): void {
    if (this._size === 0) return;
    let total = 0;
    let measuredCount = 0;
    let totalMeasured = 0;
    for (let i = 1; i <= this._size; i++) {
      if (this._measured[i] === 0) {
        this._data[i] = avg;
      } else {
        measuredCount++;
        totalMeasured += this._data[i];
      }
      this._tree[i] = this._data[i];
      total += this._data[i];
    }
    for (let i = 1; i <= this._size; i++) {
      const parent = i + (i & -i);
      if (parent <= this._size) {
        this._tree[parent] += this._tree[i];
      }
    }
    this._total = total;
    this._measuredCount = measuredCount;
    this._totalMeasured = totalMeasured;
  }

  /** Shrink tree to newSize, preserving measured heights and rebuilding with avg */
  truncate(newSize: number, avg: number): void {
    if (newSize >= this._size) return;
    for (let i = newSize + 1; i <= this._size; i++) {
      if (this._measured[i]) {
        this._measuredCount--;
        this._totalMeasured -= this._data[i];
        this._measured[i] = 0;
      }
    }
    this._size = newSize;
    this.rebuildWithAverage(avg);
  }

  clear(): void {
    this._size = 0;
    this._total = 0;
    this._measuredCount = 0;
    this._totalMeasured = 0;
    if (this._capacity > 256) {
      this._tree = new Float64Array(0);
      this._data = new Float64Array(0);
      this._measured = new Uint8Array(0);
      this._capacity = 0;
    }
  }
}
