export class FenwickTree {
  private _tree: Float64Array;
  private _data: Float64Array;
  private _size: number;
  private _capacity: number;

  constructor() {
    this._tree = new Float64Array(0);
    this._data = new Float64Array(0);
    this._size = 0;
    this._capacity = 0;
  }

  get length(): number {
    return this._size;
  }

  get total(): number {
    return this.prefixSum(this._size);
  }

  buildFrom(heights: number[]): void {
    const n = heights.length;
    this._size = n;

    if (n === 0) {
      this._tree = new Float64Array(0);
      this._data = new Float64Array(0);
      this._capacity = 0;
      return;
    }

    if (n > this._capacity) {
      const newCap = Math.max(n, 64);
      this._data = new Float64Array(newCap + 1);
      this._tree = new Float64Array(newCap + 1);
      this._capacity = newCap;
    } else {
      // Zero out the full allocated region so extend's incremental path
      // never encounters stale values from a previous larger build.
      this._tree.fill(0, 0, this._capacity + 1);
    }

    for (let i = 0; i < n; i++) {
      const i1 = i + 1;
      this._data[i1] = heights[i];
      this._tree[i1] = heights[i];
    }

    for (let i = 1; i <= n; i++) {
      const parent = i + (i & -i);
      if (parent <= n) {
        this._tree[parent] += this._tree[i];
      }
    }
  }

  prefixSum(count: number): number {
    if (count <= 0) return 0;
    if (count > this._size) count = this._size;

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

  extend(newHeights: number[]): void {
    if (newHeights.length === 0) return;

    const newSize = this._size + newHeights.length;

    if (newSize > this._capacity) {
      const newCap = Math.max(this._capacity * 2, newSize, 64);
      const newData = new Float64Array(newCap + 1);
      for (let i = 1; i <= this._size; i++) newData[i] = this._data[i];
      this._data = newData;
      this._tree = new Float64Array(newCap + 1);
      this._capacity = newCap;
    }

    // Append new data values
    for (let i = 0; i < newHeights.length; i++) {
      this._data[this._size + i + 1] = newHeights[i];
    }
    this._size = newSize;

    // Rebuild tree from data — O(n) linear build
    for (let i = 1; i <= newSize; i++) this._tree[i] = this._data[i];
    for (let i = 1; i <= newSize; i++) {
      const p = i + (i & -i);
      if (p <= newSize) this._tree[p] += this._tree[i];
    }
  }

  clear(): void {
    this._tree = new Float64Array(0);
    this._data = new Float64Array(0);
    this._size = 0;
    this._capacity = 0;
  }
}
