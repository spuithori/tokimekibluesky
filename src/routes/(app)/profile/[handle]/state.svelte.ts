import { getContext, setContext } from 'svelte';
import type { ProxyAgent } from '$lib/proxyAgent';

class AgentState {
    agent: ProxyAgent | undefined = $state();

    constructor(agent: ProxyAgent) {
        this.agent = agent;
    }
}

const agentKey = Symbol('agent');

export function setAgentContext(agent: ProxyAgent) {
    return setContext(agentKey, new AgentState(agent));
}

export function getAgentContext() {
    return getContext<ReturnType<typeof setAgentContext>>(agentKey);
}
