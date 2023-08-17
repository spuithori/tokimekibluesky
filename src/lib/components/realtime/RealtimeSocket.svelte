<script lang="ts">
    import {addExtension, decode, decodeMultiple} from "cbor-x";
    import {CID} from "multiformats";
    import {CarReader} from "@ipld/car";
    import {realtime, agent, notificationCount} from '$lib/stores';
    import {onDestroy, onMount} from "svelte";
    import {_} from "svelte-i18n";

    let timeId;
    let socket;
    let isConnected = false;

    const stateMessage = [
        $_('realtime_connecting'),
        $_('realtime_open'),
        $_('realtime_closing'),
        $_('realtime_closed')
    ];

    async function handleRealtimeNeed() {
        await connect();
    }

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
            //toast.error(get(_)('realtime_connect_closed'));
            // dispatch('disconnect');
            isConnected = false;
        });

        socket.addEventListener('open', (event) => {
            //.success(get(_)('realtime_connect_status') + ': ' + stateMessage[socket.readyState]);
            // dispatch('connect');
            isConnected = true;
        });

        socket.addEventListener('message', async (event) => {
            const messageBuf = await event.data.arrayBuffer();
            const [header, body] = decodeMultiple(new Uint8Array(messageBuf));

            if (header.op !== 1) {
                return;
            }

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

                await subscribeNotificationsCount(record, op, body)
            }
        });
    }

    async function disconnect() {
        socket.close();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        realtime.set({
            isConnected: false,
            data: undefined,
        })
    }

    async function subscribeNotificationsCount(record, op, body) {
        if (record.$type === 'app.bsky.feed.like' || record.$type === 'app.bsky.feed.repost') {
            const subjectUri = record.subject.uri;
            const subjectRepo = subjectUri.split('/')[2];

            if (subjectRepo === $agent.did()) {
                await updateNotificationsCount();
            }
        }

        if (record.$type === 'app.bsky.graph.follow') {
            const subject = record.subject;

            if (subject === $agent.did()) {
                await updateNotificationsCount();
            }
        }

        if (record.$type === 'app.bsky.feed.post' && typeof record.text === 'string') {
            const subjectUri = record.reply?.parent.uri ?? undefined;
            if (!subjectUri) {
                return false;
            }
            const subjectRepo = subjectUri.split('/')[2];

            if (subjectRepo === $agent.did()) {
                await updateNotificationsCount();
            }
        }
    }

    async function updateNotificationsCount() {
        const count = await $agent.agent.api.app.bsky.notification.getUnreadCount();
        notificationCount.set(count.data.count);
    }

    async function handleVisibilityChange(event) {
        if (!event.target.visibilityState) {
            return false;
        }

        if (event.target.visibilityState === 'hidden') {
            if (timeId) {
                clearTimeout(timeId);
            }

            timeId = setTimeout(() => {
                socket.close();
                realtime.update(r => {
                    return {...r, isConnected: false}
                })
            }, 180000)
        }

        if (event.target.visibilityState === 'visible') {
            clearTimeout(timeId);
            // toast.success(get(_)('realtime_connect_status') + ': ' + stateMessage[socket.readyState]);
        }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    onMount(async () => {
        // await connect();
    })

    onDestroy(async () => {
        socket.close();
    })
</script>

<div class="realtime-indicator">

</div>

<style lang="postcss">

</style>