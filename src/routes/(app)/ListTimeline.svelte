<script lang="ts">
    import { agent, userLists } from '$lib/stores';
    import TimelineItem from './TimelineItem.svelte';
    import { parseISO } from 'date-fns';
    import Infinite from "$lib/components/utils/Infinite.svelte";

    let { _agent = $agent, column = $bindable(), index, unique } = $props();

    let actors = [];
    let cursors = [];

    let feedPool = [];
    let feed = [];
    let count = 0;

    let list = $userLists.find(item => column.algorithm.list === item.id);

    list.members.forEach(member => {
        actors.push({
            actor: member,
            limit: 20,
            cursor: undefined,
        })
    })

    const handleLoadMore = async (loaded, complete) => {
        const ress = await _agent.getTimeline({limit: 20, cursor: '', algorithm: column.algorithm, actors: actors, count: count});

        ress.forEach((res, index) => {
            feedPool.push(...res.data.feed);
            cursors.push({
                actor: actors[index].actor,
                cursor: res.data.cursor,
            })
        })
        cursors = cursors;
        feedPool = feedPool.sort((a, b) => {
            return parseISO(b.reason ? b.reason.indexedAt : b.post.indexedAt).getTime() - parseISO(a.reason ? a.reason.indexedAt : a.post.indexedAt).getTime();
        });
        feed = feedPool.slice(0, 20);
        feedPool = feedPool.slice(20);

        if (cursors.some(item => item.cursor !== undefined) || count === 0) {
            count = count + 1;
            column.data.feed = [...column.data.feed, ...feed];
            await poolRecalc(feedPool);

            loaded();
        } else {
            complete();
        }
    }

    async function poolRecalc(currentPool: []) {
        let feedPerActorMap = new Map();
        list.members.forEach(member => {
            feedPerActorMap.set(member, []);
        });

        currentPool.forEach(feed => {
            if (feed.reason) {
                feedPerActorMap.set(feed.reason.by.did, [...feedPerActorMap.get(feed.reason.by.did), feed])
            } else {
                feedPerActorMap.set(feed.post.author.did, [...feedPerActorMap.get(feed.post.author.did), feed])
            }
        })

        actors = [];
        feedPerActorMap.forEach((value, key) => {
            if (value.length < 20) {
                actors.push({
                    actor: key,
                    limit: 20 - value.length,
                    cursor: cursors.find(item => item.actor === key)?.cursor || undefined
                })

                if (count > 0) {
                    actors = actors.filter(item => item.cursor !== undefined);
                }

                cursors = cursors.filter(item => item.actor !== key);
            }
        })
        actors = actors;
    }
</script>

{#if (list.members.length)}
  <div class="timeline timeline--{column.style}">
    <div class:media-list={column.style === 'media'} class:video-list={column.style === 'video'}>
      {#each column.data.feed as data, index (data)}
        <TimelineItem data={ data } index={index} column={column} {_agent}></TimelineItem>
      {/each}
    </div>

    <Infinite oninfinite={handleLoadMore}></Infinite>
  </div>
{:else}
  <div class="timeline timeline--main">
    空のリスト
  </div>
{/if}
