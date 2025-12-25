import {realtime, realtimeStatuses} from '$lib/stores';
import { PUBLIC_TOKIMEKI_STREAM_API } from '$env/static/public';

const COLLECTIONS = ['app.bsky.feed.post', 'app.bsky.feed.repost'];

export class RealtimeClient {
    private host: string;
    private socket: null | WebSocket;
    private shouldReconnect: boolean;
    private reconnectTimer: ReturnType<typeof setTimeout> | null;
    private reconnectAttempts: number;
    private readonly maxReconnectDelay: number = 30000;
    private readonly baseReconnectDelay: number = 1000;

    constructor(host) {
        this.host = host;
        this.socket = null;
        this.shouldReconnect = false;
        this.reconnectTimer = null;
        this.reconnectAttempts = 0;
    }

    connect() {
        if (this.socket && (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.OPEN)) {
            return;
        }

        this.shouldReconnect = true;
        this.socket = new WebSocket(`${PUBLIC_TOKIMEKI_STREAM_API}/subscribe?${COLLECTIONS.map(item => `wantedCollections=${item}`).join('&')}`);

        this.socket.onmessage = async function (event) {
            if (!event.data) {
                return;
            }

            const dataWrapper = JSON.parse(event.data);
            const data = dataWrapper.commit;

            if (data?.operation === 'create') {
                const record = data.record;

                realtime.set({
                    isConnected: true,
                    data: {
                        record: record,
                        op: {
                            path: data.rkey,
                            collection: data.collection,
                        },
                        body: {
                            repo: dataWrapper.did,
                        },
                    }
                })
            }
        };

        this.socket.onclose = async (event) => {
            console.log('socket closed.');
            this.socket = null;
            realtimeStatuses.update((r: any[] | undefined) => {
                r = r.filter(item => item !== this.host)
                return r;
            })

            if (this.shouldReconnect) {
                this.scheduleReconnect();
            }
        }

        this.socket.onopen = async (event) => {
            this.reconnectAttempts = 0;
            realtimeStatuses.update((r: any[] | undefined) => {
                return  [...r,  this.host];
            })
        }

        this.socket.onerror = async (event) => {
            console.log(event)
        }
    }

    private scheduleReconnect() {
        if (this.reconnectTimer) {
            return;
        }

        const delay = Math.min(
            this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
            this.maxReconnectDelay
        );
        this.reconnectAttempts++;

        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (this.shouldReconnect) {
                this.connect();
            }
        }, delay);
    }

    disconnect() {
        this.shouldReconnect = false;

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }

        this.reconnectAttempts = 0;
    }

    reconnect() {
        this.disconnect();
        this.connect();
    }

    status() {
        return this.socket?.readyState;
    }

    simulateDisconnect() {
        if (this.socket) {
            console.log('Simulating disconnect...');
            this.socket.close();
        }
    }
}

async function getRecord(_agent, uri, repost = undefined, retryCount = 0) {
    try {
        const res = await _agent.agent.api.app.bsky.feed.getPostThread({depth: 0, parentHeight: 1, uri: uri});
        let thread = res.data.thread;

        if (thread?.parent?.post && thread?.post?.record?.reply) {
            thread.reply = {
                parent: thread.parent.post,
                root: thread?.post?.record?.reply?.root,
            }
        }

        if (repost) {
            const rres = await _agent.agent.api.app.bsky.actor.getProfile({actor: repost.repo})
            thread.reason = {
                $type: 'app.bsky.feed.defs#reasonRepost',
                indexedAt: repost.indexedAt,
                by: rres.data,
            }
        }

        return thread;
    } catch (e) {
        if (retryCount < 3) {
            retryCount = retryCount + 1;
            console.log('Post get failure. Retry: ' + retryCount)
            await new Promise(resolve => setTimeout(resolve, 2000));
            return await getRecord(_agent, uri, repost, retryCount);
        } else {
            console.error(e);
            return null;
        }
    }
}

export async function getPostRealtime(realtime, actors, _agent) {
    const path = realtime.data.op.path;
    const repo = realtime.data.body.repo;
    const uri = 'at://' + repo + '/' + realtime.data.op.collection + '/' + path;
    const isStream: boolean = actors.some(actor => actor === repo);

    if (realtime.data.record.$type === 'app.bsky.feed.post' && typeof realtime.data.record.text === 'string') {
        if (isStream) {
            return await getRecord(_agent, uri);
        }
    }

    if (realtime.data.record.$type === 'app.bsky.feed.repost') {
        const subject = realtime.data.record.subject.uri;
        const repost = {
            repo: repo,
            indexedAt: realtime.data.record.createdAt,
        }

        if (isStream) {
            return await getRecord(_agent, subject, repost);
        }
    }
}
