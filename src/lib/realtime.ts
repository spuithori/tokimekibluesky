import {realtime, realtimeStatuses} from '$lib/stores';
import { PUBLIC_TOKIMEKI_STREAM_API } from '$env/static/public';

const COLLECTIONS = ['app.bsky.feed.post', 'app.bsky.feed.repost'];

export class RealtimeClient {
    private host: string;
    private socket: null | WebSocket;
    constructor(host) {
        this.host = host;
        this.socket = null;
    }

    connect() {
        if (!this.socket) {
            this.socket = new WebSocket(`${PUBLIC_TOKIMEKI_STREAM_API}/subscribe?${COLLECTIONS.map(item => `wantedCollections=${item}`).join('&')}`);
        }

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
            realtimeStatuses.update((r: any[] | undefined) => {
                r = r.filter(item => item !== this.host)
                return r;
            })
        }

        this.socket.onopen = async (event) => {
            realtimeStatuses.update((r: any[] | undefined) => {
                return  [...r,  this.host];
            })
        }

        this.socket.onerror = async (event) => {
            console.log(event)
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }

    reconnect() {
        this.disconnect();
        this.connect();
    }

    status() {
        return this.socket?.readyState;
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
