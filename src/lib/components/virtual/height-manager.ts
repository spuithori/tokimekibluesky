import { HEIGHT_PRUNE_FACTOR, HEIGHT_APPLY_THRESHOLD } from './constants';

export class HeightManager {
  private heights = new Map<string, number>();
  private totalMeasured = 0;
  private _measuredCount = 0;
  pending = new Map<string, number>();

  get average(): number {
    return this._measuredCount > 0 ? this.totalMeasured / this._measuredCount : 0;
  }

  get measuredCount(): number {
    return this._measuredCount;
  }

  get size(): number {
    return this.heights.size;
  }

  set(key: string, height: number): void {
    const existing = this.heights.get(key);
    if (existing !== undefined) {
      this.totalMeasured -= existing;
    } else {
      this._measuredCount++;
    }
    this.heights.set(key, height);
    this.totalMeasured += height;
  }

  get(key: string): number | undefined {
    return this.heights.get(key);
  }

  has(key: string): boolean {
    return this.heights.has(key);
  }

  applyPending(): boolean {
    if (this.pending.size === 0) return false;
    let applied = false;
    for (const [key, newHeight] of this.pending) {
      const oldHeight = this.heights.get(key);
      if (oldHeight !== undefined && Math.abs(oldHeight - newHeight) < HEIGHT_APPLY_THRESHOLD) continue;
      this.set(key, newHeight);
      applied = true;
    }
    this.pending.clear();
    return applied;
  }

  prune(activeKeys: { has(key: string): boolean }): void {
    const oldSize = this.heights.size;
    const newHeights = new Map<string, number>();
    for (const [key, h] of this.heights) {
      if (activeKeys.has(key)) {
        newHeights.set(key, h);
      } else {
        this.totalMeasured -= h;
        this._measuredCount--;
      }
    }
    this.heights = newHeights;
  }


  shouldPrune(itemCount: number): boolean {
    return this.heights.size > itemCount * HEIGHT_PRUNE_FACTOR;
  }

  clear(): void {
    this.heights.clear();
    this.totalMeasured = 0;
    this._measuredCount = 0;
    this.pending.clear();
  }

  entries(): IterableIterator<[string, number]> {
    return this.heights.entries();
  }
}
