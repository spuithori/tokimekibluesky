import { fromStore } from 'svelte/store';
import { agent } from '$lib/stores';
import type { Agent } from '$lib/agent';

const current = fromStore(agent);

class FeedsSession {
  get agent(): Agent | null {
    return current.current ?? null;
  }

  get did(): string | null {
    return this.agent?.did() ?? null;
  }
}

export const session = new FeedsSession();
