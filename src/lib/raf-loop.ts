export class RafLoop {
    private isRunning = false;
    private rafId: number | null = null;
    private frameCount = 0;
    private lastTime = 0;
    private options: {
        fps?: number;
        skipFrames?: number;
        onFrame?: () => void;
    };

    constructor(options: {
        fps?: number;
        skipFrames?: number;
        onFrame?: () => void;
    } = {}) {
        this.options = options;
    }

    start(): void {
        if (this.isRunning) {
            console.warn('RafLoop is already running');
            return;
        }

        this.isRunning = true;
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.loop();
    }

    stop(): void {
        if (!this.isRunning) {
            return;
        }

        this.isRunning = false;
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    private loop = (): void => {
        if (!this.isRunning) {
            return;
        }

        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;

        if (this.options.fps) {
            const minInterval = 1000 / this.options.fps;
            if (deltaTime < minInterval) {
                this.rafId = requestAnimationFrame(this.loop);
                return;
            }
        }

        if (this.options.skipFrames) {
            this.frameCount++;
            if (this.frameCount % this.options.skipFrames !== 0) {
                this.rafId = requestAnimationFrame(this.loop);
                return;
            }
        }

        this.lastTime = currentTime;
        this.options.onFrame?.();
        this.rafId = requestAnimationFrame(this.loop);
    }

    isActive(): boolean {
        return this.isRunning;
    }
}