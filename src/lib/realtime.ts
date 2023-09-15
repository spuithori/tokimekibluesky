import {addExtension, decode, decodeMultiple} from "cbor-x";
import {CID} from "multiformats";
import {CarReader} from "@ipld/car";
import { get } from 'svelte/store';
import {realtime, agent, notificationCount, isRealtimeConnected} from '$lib/stores';

let timeId;
let socket;

export async function connect() {
    if (socket) {
        return false;
    }

    socket = undefined;
    socket = new WebSocket('wss://bsky.social/xrpc/com.atproto.sync.subscribeRepos');

    /*
      Inspired by blue-skies-ahead (MIT License).
      https://glitch.com/~blue-skies-ahead
     */

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

    socket.addEventListener('close', (event) => {
        isRealtimeConnected.set(false);
    });

    socket.addEventListener('open', (event) => {
        isRealtimeConnected.set(true);
    });

    socket.addEventListener('message', async (event) => {
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
    });
}

export async function disconnect() {
    try {
        socket.close();
        socket = undefined;
        // document.removeEventListener('visibilitychange', handleVisibilityChange);
        realtime.set({
            isConnected: false,
            data: undefined,
        })
    } catch(e) {
        console.log(e);
        socket = undefined;
        realtime.set({
            isConnected: false,
            data: undefined,
        })

        if (!socket) {
            await connect();
        }
    }
}

async function handleVisibilityChange(event) {
    if (!event.target.visibilityState) {
        return false;
    }

    /* if (event.target.visibilityState === 'hidden') {
        if (timeId) {
            clearTimeout(timeId);
        }

        timeId = setTimeout(() => {
            socket.close();
            realtime.update(r => {
                return {...r, isConnected: false}
            })
        }, 180000)
    } */

    if (event.target.visibilityState === 'visible') {
        clearTimeout(timeId);
    }
}

document.addEventListener('visibilitychange', handleVisibilityChange)