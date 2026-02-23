export class FenwickTree {
  private _h: Float64Array = new Float64Array(0);
  private _bit: Float64Array = new Float64Array(0);
  private _m: Uint8Array = new Uint8Array(0);
  private _total = 0;
  private _mc = 0;
  private _tm = 0;
  private _logN = 0;

  get length() { return this._h.length; }
  get total() { return this._total; }
  get measuredCount() { return this._mc; }
  get measuredAverage() { return this._mc > 0 ? this._tm / this._mc : 0; }
  get capacityBytes() { return this._h.byteLength + this._bit.byteLength + this._m.byteLength; }

  get(index: number): number { return index >= 0 && index < this._h.length ? this._h[index] : 0; }
  isMeasured(index: number): boolean { return index >= 0 && index < this._m.length ? this._m[index] !== 0 : false; }

  private _update(i1: number, delta: number): void {
    const n = this._h.length;
    for (let j = i1; j <= n; j += j & (-j)) this._bit[j] += delta;
  }

  private _buildBit(): void {
    const n = this._h.length;
    const bit = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) bit[i + 1] = this._h[i];
    for (let i = 1; i <= n; i++) {
      const p = i + (i & (-i));
      if (p <= n) bit[p] += bit[i];
    }
    this._bit = bit;
    this._logN = Math.floor(Math.log2(n || 1));
  }

  set(index: number, height: number): void {
    if (index < 0 || index >= this._h.length) return;
    const delta = height - this._h[index];
    if (delta === 0) return;
    this._h[index] = height;
    this._total += delta;
    if (this._m[index]) this._tm += delta;
    this._update(index + 1, delta);
  }

  setMeasured(index: number, height: number): void {
    if (index < 0 || index >= this._h.length) return;
    const old = this._h[index];
    const delta = height - old;
    if (delta !== 0) {
      this._h[index] = height;
      this._total += delta;
      this._update(index + 1, delta);
    }
    if (this._m[index]) {
      this._tm += delta;
    } else {
      this._m[index] = 1;
      this._mc++;
      this._tm += height;
    }
  }

  clearMeasured(): void {
    this._m.fill(0);
    this._mc = 0;
    this._tm = 0;
  }

  prefixSum(count: number): number {
    if (count <= 0) return 0;
    if (count >= this._h.length) return this._total;
    let s = 0;
    for (let i = count; i > 0; i -= i & (-i)) s += this._bit[i];
    return s;
  }

  findIndex(target: number): number {
    const n = this._h.length;
    if (n === 0 || target <= 0) return 0;
    let pos = 0, rem = target;
    for (let k = this._logN; k >= 0; k--) {
      const next = pos + (1 << k);
      if (next <= n && this._bit[next] <= rem) {
        rem -= this._bit[next];
        pos = next;
      }
    }
    return Math.min(pos, n - 1);
  }

  buildFrom(heights: number[]): void {
    this.buildWithCallback(heights.length, (i) => heights[i]);
  }

  buildWithCallback(n: number, getHeight: (i: number) => number): void {
    const h = new Float64Array(n);
    const m = new Uint8Array(n);
    let t = 0;
    for (let i = 0; i < n; i++) {
      h[i] = getHeight(i);
      t += h[i];
    }
    this._h = h;
    this._m = m;
    this._mc = 0;
    this._tm = 0;
    this._total = t;
    this._buildBit();
  }

  buildWithMeasured(n: number, getHeight: (i: number) => number, isMeasuredFn: (i: number) => boolean): void {
    this.buildWithCallback(n, getHeight);
    for (let i = 0; i < n; i++) {
      if (isMeasuredFn(i)) {
        this._m[i] = 1;
        this._mc++;
        this._tm += this._h[i];
      }
    }
  }

  prependWithCallback(count: number, getHeight: (i: number) => number): void {
    if (count === 0) return;
    const oldLen = this._h.length;
    const newLen = oldLen + count;
    const newH = new Float64Array(newLen);
    const newM = new Uint8Array(newLen);
    let added = 0;
    for (let i = 0; i < count; i++) {
      newH[i] = getHeight(i);
      added += newH[i];
    }
    newH.set(this._h, count);
    newM.set(this._m, count);
    this._h = newH;
    this._m = newM;
    this._total += added;
    this._buildBit();
  }

  prependAndTruncate(count: number, targetLen: number, getHeight: (i: number) => number, avg: number): void {
    if (count === 0 && targetLen >= this._h.length) return;
    const oldLen = this._h.length;
    if (targetLen >= oldLen + count) {
      this.prependWithCallback(count, getHeight);
      return;
    }
    const newH = new Float64Array(targetLen);
    const newM = new Uint8Array(targetLen);
    const prependEnd = Math.min(count, targetLen);
    for (let i = 0; i < prependEnd; i++) {
      newH[i] = getHeight(i);
    }
    const copyLen = Math.max(0, targetLen - count);
    if (copyLen > 0) {
      newH.set(this._h.subarray(0, copyLen), count);
      newM.set(this._m.subarray(0, copyLen), count);
    }
    this._h = newH;
    this._m = newM;
    this.rebuildWithAverage(avg);
  }

  extend(newHeights: number[]): void {
    this.extendWithCallback(newHeights.length, (i) => newHeights[i]);
  }

  extendWithCallback(count: number, getHeight: (i: number) => number): void {
    if (count === 0) return;
    const oldLen = this._h.length;
    const newLen = oldLen + count;
    const newH = new Float64Array(newLen);
    const newM = new Uint8Array(newLen);
    newH.set(this._h);
    newM.set(this._m);
    let added = 0;
    for (let i = 0; i < count; i++) {
      newH[oldLen + i] = getHeight(i);
      added += newH[oldLen + i];
    }
    this._h = newH;
    this._m = newM;
    this._total += added;
    this._buildBit();
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
    this._buildBit();
  }

  truncate(newSize: number, avg: number): void {
    if (newSize >= this._h.length) return;
    for (let i = newSize; i < this._h.length; i++) {
      if (this._m[i]) { this._mc--; this._tm -= this._h[i]; }
    }
    this._h = this._h.slice(0, newSize);
    this._m = this._m.slice(0, newSize);
    this.rebuildWithAverage(avg);
  }

  clear(): void {
    this._h = new Float64Array(0);
    this._bit = new Float64Array(0);
    this._m = new Uint8Array(0);
    this._total = 0;
    this._mc = 0;
    this._tm = 0;
    this._logN = 0;
  }
}
