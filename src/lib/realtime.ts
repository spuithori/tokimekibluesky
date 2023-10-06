import {addExtension, decode, decodeMultiple} from "cbor-x";
import {CID} from "multiformats";
import {CarReader} from "@ipld/car";
import {realtime} from '$lib/stores';

export class RealtimeClient {
    private host: string;
    private socket: null | WebSocket;
    constructor(host) {
        this.host = host;
        this.socket = null;
    }

    connect() {
        if (!this.socket) {
            this.socket = new WebSocket('wss://' + this.host + '/xrpc/com.atproto.sync.subscribeRepos');
        }

        addExtension({
            Class: CID,
            tag: 42,
            encode: () => {
                throw new Error('Cannot encode cids');
            },
            decode: (bytes) => {
                if (bytes[0] !== 0) {
                    throw new Error('Invalid cid');
                }
                return CID.decode(bytes.subarray(1)); // ignore leading 0x00
            },
        });

        this.socket.onmessage = async function (event) {
            const messageBuf = await event.data.arrayBuffer();
            const [header, body] = decodeMultiple(new Uint8Array(messageBuf));

            if (header.op !== 1) {
                return;
            }

            try {
                const car = await CarReader.fromBytes(body.blocks);

                for (const op of body.ops) {
                    if (!op.cid) continue;
                    const block = await car.get(op.cid);
                    const record = decode(block.bytes);
                    realtime.set({
                        isConnected: true,
                        data: {
                            record: record,
                            op: op,
                            body: body,
                        }
                    })
                }
            } catch (e) {
                // do nothing.
            }
        };

        this.socket.onclose = async (event) => {
            console.log('socket closed.');
            //await new Promise(resolve => setTimeout(resolve, 3000));
            //this.reconnect();
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

        if (thread?.parent && thread.post.record.reply) {
            thread.reply = {
                parent: thread.parent.post,
                root: thread.post.record.reply.root,
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
            await getRecord(_agent, uri, repost, retryCount);
        } else {
            console.error(e);
            return null;
        }
    }
}

export async function getPostRealtime(realtime, actors, _agent) {
    const path = realtime.data.op.path;
    const repo = realtime.data.body.repo;
    const uri = 'at://' + repo + '/' + path;
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
