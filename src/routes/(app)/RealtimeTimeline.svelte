<script lang="ts">
    import { agent } from '$lib/stores';
    import { settings, timelines, cursors, realtime } from "$lib/stores";
    import TimelineItem from "./TimelineItem.svelte";
    import {createEventDispatcher, onDestroy, onMount} from 'svelte';
    import MediaTimelineItem from "./MediaTimelineItem.svelte";
    const dispatch = createEventDispatcher();

    import { CID } from 'multiformats';
    import { CarReader } from '@ipld/car';
    import { decode, decodeMultiple, addExtension } from 'cbor-x';
    import toast from "svelte-french-toast";
    import {_} from "svelte-i18n";
    import {connect, disconnect} from "$lib/realtime";

    export let column;
    export let index;

    if(!$timelines[index]) {
        $timelines[index] = [];
    }

    let follows = [];
    let isFollowsListRefreshing = false;
    let isFollowsListFinished = false;
    let socket;
    let timeId;

    const stateMessage = [
        $_('realtime_connecting'),
        $_('realtime_open'),
        $_('realtime_closing'),
        $_('realtime_closed')
    ];

    $: {
        if (socket && socket.readyState) {
            console.log(stateMessage[socket.readyState]);
        }
    }

    $: getRealtime($realtime.data);

    /* export async function connect() {
        socket = new WebSocket('wss://bsky.social/xrpc/com.atproto.sync.subscribeRepos');

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
            dispatch('connect');
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
    } */

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

        /* timeline.update(function (tl) {
            tl.forEach(item => item.post.indexedAt = item.post.indexedAt);
            return [ thread, ...tl];
        }); */

        $timelines[index].forEach(item => item.post.indexedAt = item.post.indexedAt);
        $timelines[index] = [thread, ...$timelines[index]];
        // console.log($timeline);
    }

    async function getRealtime(data) {
        if (!$realtime.isConnected) {
            await connect();
        }

        if (!isFollowsListFinished) {
            return false;
        }

        if (data.record.$type === 'app.bsky.feed.post' && typeof data.record.text === 'string') {
            const path = data.op.path;
            const repo = data.body.repo;
            const uri = 'at://' + repo + '/' + path

            if (follows.some(follow => follow === repo)) {
                await getRecord(uri);
            }
        }

        if (data.record.$type === 'app.bsky.feed.repost') {
            const subject = data.record.subject.uri;
            const repo = data.body.repo;

            const repost = {
                repo: repo,
                indexedAt: data.record.createdAt,
            }

            if (follows.some(follow => follow === repo)) {
                await getRecord(subject, repost);
            }
        }
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
        const res = await $agent.getTimeline({limit: 20, cursor: '', algorithm: column.algorithm});
        $timelines[index] = res.data.feed;
        // timeline.set(res.data.feed);

        if (localStorage.getItem('follows')) {
            follows = JSON.parse(localStorage.getItem('follows'))
        } else {
            await getFollows();
        }

        isFollowsListFinished = true;
    })

    onDestroy(async() => {
         //socket.close();
        await disconnect();
    })
</script>

<div class="realtime-wrap">
  <div class="timeline timeline--main" class:hide-repost={$settings?.timeline.hideRepost} class:hide-reply={$settings?.timeline.hideReply}>
    <div class="realtime-follows">
      <div class="realtime-status" class:realtime-status--connected={$realtime.isConnected}></div>

      <p class="realtime-follows__count"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-users-2" aria-label="{$_('realtime_follows_count')}"><path d="M14 19a6 6 0 0 0-12 0"/><circle cx="8" cy="9" r="4"/><path d="M22 19a6 6 0 0 0-6-6 4 4 0 1 0 0-8"/></svg> {follows.length}</p>

      <button class="button button--ss" disabled={isFollowsListRefreshing} on:click={refreshFollowsList}>{$_('realtime_follows_refresh')}</button>
    </div>

    {#if (column.style === 'default')}
      {#each $timelines[index] as data, index (data)}
        <TimelineItem data={ data } index={index}></TimelineItem>
      {/each}
    {:else}
      <div class="media-list">
        {#each $timelines[index] as data (data)}
          {#if (data.post.embed?.images)}
            <MediaTimelineItem data={data}></MediaTimelineItem>
          {/if}
        {/each}
      </div>
    {/if}

    <p class="realtime-note">実験的機能。通信量にご注意ください。<br>フォロー数3000まで。3000人以上いる場合は直近のフォローが取得されます。<br>取得漏れが発生する可能性があります。<br>Experimental feature. Please note the amount of traffic.<br>Up to 1000 followers; if there are more than 1000 followers, the most recent followings will be retrieved.<br>Failure to retrieve submissions may occur.</p>
  </div>
</div>

<style lang="postcss">
  .realtime-note {
      font-size: 14px;
      margin-top: 20px;
  }

  .realtime-follows {
      display: flex;
      align-items: center;
      gap: 10px;

      &__count {
          margin-right: auto;
          display: flex;
          align-items: center;
          gap: 4px;
      }
  }

  .realtime-status {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--color-theme-7);
      position: relative;
      margin-top: 2px;

      &::before {
          content: '';
          display: block;
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          box-shadow: 0 0 0 4px var(--color-theme-7);
          opacity: .3;
          animation: 1s ease-in-out infinite alternate status-dot;
      }

      &--connected {
          background-color: var(--color-theme-8);

          &::before {
              box-shadow: 0 0 0 4px var(--color-theme-8);
          }
      }
  }

  @keyframes status-dot {
      0% {
          opacity: .3;
      }

      100% {
          opacity: .2;
      }
  }
</style>