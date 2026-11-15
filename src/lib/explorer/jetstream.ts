export interface JetstreamEvent {
    did: string;
    time_us: number;
    kind: 'commit' | 'identity' | 'account';
    commit?: { rev: string; operation: 'create' | 'update' | 'delete'; collection: string; rkey: string; record?: Record<string, unknown>; cid?: string };
    identity?: { did: string; handle?: string; seq: number; time: string };
    account?: { active: boolean; did: string; seq: number; time: string; status?: string };
}

export const JETSTREAM_HOSTS = [
    'jetstream.us-east.bsky.network',
    'jetstream.us-west.bsky.network',
    'jetstream2.us-east.bsky.network',
    'jetstream1.us-west.bsky.network',
];

export interface JetstreamOptions {
    host?: string;
    collections?: string[];
    dids?: string[];
    onEvent: (event: JetstreamEvent) => void;
    onState: (state: 'connecting' | 'open' | 'closed' | 'error') => void;
}

export function connectJetstream(options: JetstreamOptions): () => void {
    const query = new URLSearchParams();
    for (const collection of options.collections ?? []) query.append('wantedCollections', collection);
    for (const did of options.dids ?? []) query.append('wantedDids', did);
    const socket = new WebSocket(`wss://${options.host ?? JETSTREAM_HOSTS[0]}/subscribe?${query}`);
    let closedByUser = false;

    options.onState('connecting');
    socket.onopen = () => options.onState('open');
    socket.onerror = () => options.onState('error');
    socket.onclose = () => {
        if (!closedByUser) options.onState('closed');
    };
    socket.onmessage = (message) => {
        try {
            options.onEvent(JSON.parse(message.data));
        } catch {
            return;
        }
    };

    return () => {
        closedByUser = true;
        socket.close();
    };
}
