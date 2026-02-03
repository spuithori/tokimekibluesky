<script lang="ts">
    import { userLists } from '$lib/stores';
    import TimelineItem from './TimelineItem.svelte';
    import Infinite from "$lib/components/utils/Infinite.svelte";
    import {getColumnState} from "$lib/classes/columnState.svelte";

    let { index, _agent, isJunk, unique, isSplit = false, column: columnProp = undefined } = $props();

    const columnState = getColumnState(isJunk);
    const column = columnProp ?? columnState.getColumn(index);
    let actors = [];
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

        if (!Array.isArray(column.data.cursor)) {
          column.data.cursor = [];
        }

        ress.forEach((res, index) => {
            feedPool.push(...res.data.feed);
            column.data.cursor.push({
                actor: actors[index].actor,
                cursor: res.data.cursor,
            })
        })
        feedPool = feedPool.sort((a, b) => {
            return new Date(b.reason ? b.reason.indexedAt : b.post.indexedAt).getTime() - new Date(a.reason ? a.reason.indexedAt : a.post.indexedAt).getTime();
        });
        feed = feedPool.slice(0, 20);
        feedPool = feedPool.slice(20);

        if (column.data.cursor.some(item => item.cursor !== undefined) || count === 0) {
            count = count + 1;
            columnState.replaceFeed(column.id, f => [...f, ...feed]);
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
                    cursor: column.data.cursor.find(item => item.actor === key)?.cursor || undefined
                })

                if (count > 0) {
                    actors = actors.filter(item => item.cursor !== undefined);
                }

                column.data.cursor = column.data.cursor.filter(item => item.actor !== key);
            }
        })
        actors = actors;
    }
</script>

{#if (list.members.length)}
  <div class="timeline timeline--{column.style}">
    <div class:media-list={column.style === 'media'} class:video-list={column.style === 'video'}>
      {#each columnState.getFeed(column.id) as data, index (data)}
        <TimelineItem data={ data } index={index} column={column} {_agent} feed={columnState.getFeed(column.id)}></TimelineItem>
      {/each}
    </div>

    <Infinite oninfinite={handleLoadMore}></Infinite>
  </div>
{:else}
  <div class="timeline timeline--main">
    空のリスト
  </div>
{/if}
