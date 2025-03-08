import { agents } from "$lib/stores";
import { get } from 'svelte/store';

class ChatState {
  totalChatCount = $state<number>(0);

  updateTotalChatCount() {
    const _agents = get(agents);
    this.totalChatCount = Array.from(_agents.values()).reduce((count, agent) => count + agent.unreadChat, 0);
  }
}

export const chatState = new ChatState();