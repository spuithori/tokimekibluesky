import { setXrpcFailureListener } from '$lib/xrpc-client';
import type { BskyIncident, BskyStatusResponse } from '$lib/bskyStatus';

const CHECK_MIN_INTERVAL = 60 * 1000;
const STALE_INTERVAL = 5 * 60 * 1000;

class BskyStatusState {
    incident = $state.raw<BskyIncident | null>(null);
    downMonitors = $state.raw<string[]>([]);
    #dismissedKey = $state('');
    #lastCheckedAt = 0;
    #checking = false;
    #booted = false;

    get #currentKey(): string {
        if (this.incident) {
            return `i${this.incident.id}`;
        }
        if (this.downMonitors.length) {
            return `m${this.downMonitors.join(',')}`;
        }
        return '';
    }

    get isVisible(): boolean {
        const key = this.#currentKey;
        return !!key && key !== this.#dismissedKey;
    }

    dismiss(): void {
        this.#dismissedKey = this.#currentKey;
    }

    boot(): void {
        if (this.#booted || typeof window === 'undefined') {
            return;
        }
        this.#booted = true;

        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => this.check());
        } else {
            setTimeout(() => this.check(), 3000);
        }
    }

    checkIfStale(): void {
        if (Date.now() - this.#lastCheckedAt < STALE_INTERVAL) {
            return;
        }
        this.check();
    }

    reportFailure = (): void => {
        if (typeof window === 'undefined') {
            return;
        }
        if (this.#checking || Date.now() - this.#lastCheckedAt < CHECK_MIN_INTERVAL) {
            return;
        }
        this.check();
    };

    async check(): Promise<void> {
        if (this.#checking) {
            return;
        }
        this.#checking = true;
        this.#lastCheckedAt = Date.now();

        try {
            const res = await fetch('/api/bsky-status');
            if (!res.ok) {
                return;
            }
            const data: BskyStatusResponse = await res.json();
            if (!data.ok) {
                return;
            }
            this.incident = data.incident ?? null;
            this.downMonitors = data.downMonitors ?? [];
        } catch {
        } finally {
            this.#checking = false;
        }
    }
}

export const bskyStatusState = new BskyStatusState();

setXrpcFailureListener(bskyStatusState.reportFailure);
