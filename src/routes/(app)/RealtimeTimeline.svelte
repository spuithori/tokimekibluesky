<script lang="ts">
    import { agent, cursor } from '$lib/stores';
    import { timeline, settings, currentAlgorithm, timelineStyle } from "$lib/stores";
    import TimelineItem from "./TimelineItem.svelte";
    import {createEventDispatcher, onDestroy, onMount} from 'svelte';
    import MediaTimelineItem from "./MediaTimelineItem.svelte";
    const dispatch = createEventDispatcher();

    import { CID } from 'multiformats';
    import { CarReader } from '@ipld/car';
    import { decode, decodeMultiple, addExtension } from 'cbor-x';
    import toast from "svelte-french-toast";
    import {_} from "svelte-i18n";

    let follows = [];
    let isFollowsListRefreshing = false;
    let socket;
    let timeId;

    const stateMessage = [
        $_('realtime_connecting'),
        $_('realtime_open'),
        $_('realtime_closing'),
        $_('realtime_closed')
    ]

    export let isRefreshing;

    $: {
        if (socket && socket.readyState) {
            console.log(stateMessage[socket.readyState]);
        }
    }

    async function handleVisibilityChange(event) {
        if (event.target.visibilityState === 'hidden') {
            if (timeId) {
                clearTimeout(timeId);
            }

            timeId = setTimeout(() => {
                socket.close();
            }, 180000)
        }

        if (event.target.visibilityState === 'visible') {
            clearTimeout(timeId);
            toast.success($_('realtime_connect_status') + ': ' + stateMessage[socket.readyState]);
        }
    }

    export async function connect() {
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
            toast.error($_('realtime_connect_closed'));
            dispatch('disconnect');
        });

        socket.addEventListener('open', (event) => {
            toast.success($_('realtime_connect_status') + ': ' + stateMessage[socket.readyState]);
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

                if (record.$type === 'app.bsky.feed.post' && typeof record.text === 'string') {
                    const path = op.path;
                    const repo = body.repo;
                    const uri = 'at://' + repo + '/' + path

                    if (follows.some(follow => follow === repo)) {
                        await getRecord(uri);
                    }
                }

                if (record.$type === 'app.bsky.feed.repost') {
                    const subject = record.subject.uri;
                    const repo = body.repo;

                    const repost = {
                        repo: repo,
                        indexedAt: record.createdAt,
                    }

                    if (follows.some(follow => follow === repo)) {
                        await getRecord(subject, repost);
                    }
                }
            }
        });
    }

    async function getRecord(uri, repost = undefined) {
        const res = await $agent.agent.api.app.bsky.feed.getPostThread({depth: 0, uri: uri});
        let thread = res.data.thread;

        if (thread?.parent && thread.post.record.reply) {
            thread.reply = {
                parent: thread.parent.post,
                root: thread.post.record.reply.root,
            }
        }

        if (repost) {
            const rres = await $agent.agent.api.app.bsky.actor.getProfile({actor: repost.repo})
            thread.reason = {
                $type: 'app.bsky.feed.defs#reasonRepost',
                indexedAt: repost.indexedAt,
                by: rres.data,
            }
        }

        timeline.update(function (tl) {
            tl.forEach(item => item.post.indexedAt = item.post.indexedAt);
            return [ thread, ...tl];
        });
        console.log($timeline);
    }

    async function getFollows() {
        isFollowsListRefreshing = true;
        let cursor = '';
        let count = 0;
        follows = [];

        try {
            follows = [...follows, $agent.did()];

            while(cursor !== undefined && count < 30) {
                const res = await $agent.agent.api.app.bsky.graph.getFollows({actor: $agent.did(), limit: 100, cursor: cursor});

                res.data.follows.forEach(follow => {
                    follows = [...follows, follow.did];
                })

                count = count + 1;
                cursor = res.data.cursor;
            }

            localStorage.setItem('follows', JSON.stringify(follows));

            toast.success($_('realtime_success_get_follows') + ': ' + follows.length);
            isFollowsListRefreshing = false;
        } catch(e) {
            toast.error($_('realtime_failed_get_follows'));
            dispatch('disconnect');
            isFollowsListRefreshing = false;
            throw new Error(e);
        }
    }

    async function refreshFollowsList() {
        await getFollows();
    }

    onMount(async () => {
        const res = await $agent.getTimeline({limit: 20, cursor: '', algorithm: $currentAlgorithm});
        timeline.set(res.data.feed);

        if (localStorage.getItem('follows')) {
            follows = JSON.parse(localStorage.getItem('follows'))
        } else {
            await getFollows();
        }

        await connect();
    })

    onDestroy(async() => {
        socket.close();
    })
</script>

<svelte:document on:visibilitychange={handleVisibilityChange} />

<div class="realtime-wrap">
  <div class="timeline timeline--main" class:hide-repost={$settings?.timeline.hideRepost} class:hide-reply={$settings?.timeline.hideReply}>
    <div class="realtime-follows">
      <p class="realtime-follows__count">{$_('realtime_follows_count')}: {follows.length}</p>

      <button class="button button--ss" disabled={isFollowsListRefreshing} on:click={refreshFollowsList}>{$_('realtime_follows_refresh')}</button>
    </div>

    {#if ($timelineStyle === 'default')}
      {#each $timeline as data, index (data)}
        <TimelineItem data={ data } index={index}></TimelineItem>
      {/each}
    {:else}
      <div class="media-list">
        {#each $timeline as data (data)}
          {#if (data.post.embed?.images)}
            <MediaTimelineItem data={data}></MediaTimelineItem>
          {/if}
        {/each}
      </div>
    {/if}

    <p class="realtime-note">実験的機能。通信量にご注意ください。<br>フォロー数3000まで。3000人以上いる場合は直近のフォローが取得されます。<br>取得漏れが発生する可能性があります。<br>Experimental feature. Please note the amount of traffic.<br>Up to 1000 followers; if there are more than 1000 followers, the most recent followings will be retrieved.<br>Failure to retrieve submissions may occur.</p>
  </div>
</div>

<style>
  .realtime-note {
      font-size: 14px;
      margin-top: 20px;
  }

  .realtime-follows {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 15px;
  }
</style>