import { agents } from "$lib/stores";
import { get } from 'svelte/store';

class ChatState {
  counts = $state<Record<string, { accepted: number; requests: number }>>({});
  totalChatCount = $state<number>(0);
  totalChatRequestCount = $state<number>(0);

  setCounts(did: string, accepted: number, requests: number) {
    this.counts[did] = { accepted, requests };
    this.updateTotals();
  }

  getRequestCount(did: string | undefined): number {
    return did ? (this.counts[did]?.requests ?? 0) : 0;
  }

  updateTotals() {
    const _agents = Array.from(get(agents).values());
    this.totalChatCount = _agents.reduce((count, agent) => count + (agent.unreadChat || 0), 0);
    this.totalChatRequestCount = _agents.reduce((count, agent) => count + (agent.unreadChatRequests || 0), 0);
  }
}

export const chatState = new ChatState();
