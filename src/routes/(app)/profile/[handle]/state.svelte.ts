import { getContext, setContext } from 'svelte';
import type { Agent } from '$lib/agent';

class AgentState {
    agent: Agent | undefined = $state();

    constructor(agent: Agent) {
        this.agent = agent;
    }
}

const agentKey = Symbol('agent');

export function setAgentContext(agent: Agent) {
    return setContext(agentKey, new AgentState(agent));
}

export function getAgentContext() {
    return getContext<ReturnType<typeof setAgentContext>>(agentKey);
}
