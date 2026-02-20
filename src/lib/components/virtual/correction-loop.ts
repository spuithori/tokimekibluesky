export interface CorrectionOpts {
  threshold: number;
  maxPasses: number;
  measure: 'full' | 'incremental' | 'none';
  navigating: boolean;
  onStart?: () => void;
  onFinish?: () => void;
}

interface CorrectionState extends CorrectionOpts {
  computeDrift: () => number | null;
  pass: number;
}

export interface CorrectionContext {
  scheduleFrame: (flag: number) => void;
  measureFull: () => void;
  measureIncremental: () => void;
  getScrollTop: () => number;
  setScrollTop: (v: number) => void;
  finishNavigation: () => void;
  DIRTY_CORRECTION: number;
}

export class CorrectionLoop {
  private state: CorrectionState | null = null;

  constructor(private ctx: CorrectionContext) {}

  start(computeDrift: () => number | null, opts: CorrectionOpts): void {
    if (this.state) {
      this.state.onFinish?.();
      if (this.state.navigating) this.ctx.finishNavigation();
    }
    this.state = { computeDrift, ...opts, pass: 0 };
    this.ctx.scheduleFrame(this.ctx.DIRTY_CORRECTION);
  }

  processPass(scrollContainer: HTMLElement | null | undefined): void {
    if (!this.state) return;
    if (!scrollContainer || this.state.pass >= this.state.maxPasses) {
      const s = this.state;
      this.state = null;
      s.onFinish?.();
      if (s.navigating) this.ctx.finishNavigation();
      return;
    }

    if (this.state.pass === 0 && this.state.onStart) {
      this.state.onStart();
      this.state.onStart = undefined;
    }

    if (this.state.measure === 'full') this.ctx.measureFull();
    else if (this.state.measure === 'incremental') this.ctx.measureIncremental();

    const drift = this.state.computeDrift();
    const currentScrollTop = this.ctx.getScrollTop();

    if (drift === null || Math.abs(drift) <= this.state.threshold) {
      const s = this.state;
      this.state = null;
      s.onFinish?.();
      if (s.navigating) this.ctx.finishNavigation();
      return;
    }

    this.ctx.setScrollTop(currentScrollTop + drift);
    this.state.pass++;
    this.ctx.scheduleFrame(this.ctx.DIRTY_CORRECTION);
  }

  cancel(): void {
    if (this.state) {
      this.state.onFinish?.();
      if (this.state.navigating) this.ctx.finishNavigation();
    }
    this.state = null;
  }
}
