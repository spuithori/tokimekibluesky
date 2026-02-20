/** Array-backed height store with measured tracking. O(n) prefix sums. */
export class FenwickTree {
  private _h: number[] = [];
  private _m: boolean[] = [];
  private _total = 0;
  private _mc = 0;
  private _tm = 0;

  get length() { return this._h.length; }
  get total() { return this._total; }
  get measuredCount() { return this._mc; }
  get measuredAverage() { return this._mc > 0 ? this._tm / this._mc : 0; }
  get capacityBytes() { return this._h.length * 12; }

  get(index: number): number { return this._h[index] ?? 0; }
  isMeasured(index: number): boolean { return this._m[index] ?? false; }

  set(index: number, height: number): void {
    if (index < 0 || index >= this._h.length) return;
    this._total += height - this._h[index];
    if (this._m[index]) this._tm += height - this._h[index];
    this._h[index] = height;
  }

  setMeasured(index: number, height: number): void {
    if (index < 0 || index >= this._h.length) return;
    const old = this._h[index];
    const delta = height - old;
    if (delta !== 0) { this._h[index] = height; this._total += delta; }
    if (this._m[index]) {
      this._tm += delta;
    } else {
      this._m[index] = true;
      this._mc++;
      this._tm += height;
    }
  }

  clearMeasured(): void {
    this._m.fill(false);
    this._mc = 0;
    this._tm = 0;
  }

  prefixSum(count: number): number {
    if (count <= 0) return 0;
    if (count >= this._h.length) return this._total;
    let s = 0;
    for (let i = 0; i < count; i++) s += this._h[i];
    return s;
  }

  findIndex(target: number): number {
    const n = this._h.length;
    if (n === 0 || target <= 0) return 0;
    let s = 0;
    for (let i = 0; i < n; i++) {
      s += this._h[i];
      if (s > target) return i;
    }
    return n - 1;
  }

  buildFrom(heights: number[]): void {
    this.buildWithCallback(heights.length, (i) => heights[i]);
  }

  buildWithCallback(n: number, getHeight: (i: number) => number): void {
    this._h.length = n;
    this._m.length = n;
    this._mc = 0;
    this._tm = 0;
    let t = 0;
    for (let i = 0; i < n; i++) {
      const h = getHeight(i);
      this._h[i] = h;
      this._m[i] = false;
      t += h;
    }
    this._total = t;
  }

  buildWithMeasured(n: number, getHeight: (i: number) => number, isMeasuredFn: (i: number) => boolean): void {
    this.buildWithCallback(n, getHeight);
    for (let i = 0; i < n; i++) {
      if (isMeasuredFn(i)) {
        this._m[i] = true;
        this._mc++;
        this._tm += this._h[i];
      }
    }
  }

  prependWithCallback(count: number, getHeight: (i: number) => number): void {
    if (count === 0) return;
    const newH = new Array<number>(count);
    const newM = new Array<boolean>(count);
    let added = 0;
    for (let i = 0; i < count; i++) {
      newH[i] = getHeight(i);
      newM[i] = false;
      added += newH[i];
    }
    this._h.unshift(...newH);
    this._m.unshift(...newM);
    this._total += added;
  }

  extend(newHeights: number[]): void {
    this.extendWithCallback(newHeights.length, (i) => newHeights[i]);
  }

  extendWithCallback(count: number, getHeight: (i: number) => number): void {
    if (count === 0) return;
    let added = 0;
    for (let i = 0; i < count; i++) {
      const h = getHeight(i);
      this._h.push(h);
      this._m.push(false);
      added += h;
    }
    this._total += added;
  }

  rebuildWithAverage(avg: number): void {
    let t = 0, mc = 0, tm = 0;
    for (let i = 0; i < this._h.length; i++) {
      if (!this._m[i]) this._h[i] = avg;
      else { mc++; tm += this._h[i]; }
      t += this._h[i];
    }
    this._total = t;
    this._mc = mc;
    this._tm = tm;
  }

  truncate(newSize: number, avg: number): void {
    if (newSize >= this._h.length) return;
    for (let i = newSize; i < this._h.length; i++) {
      if (this._m[i]) { this._mc--; this._tm -= this._h[i]; }
    }
    this._h.length = newSize;
    this._m.length = newSize;
    this.rebuildWithAverage(avg);
  }

  clear(): void {
    this._h.length = 0;
    this._m.length = 0;
    this._total = 0;
    this._mc = 0;
    this._tm = 0;
  }
}
