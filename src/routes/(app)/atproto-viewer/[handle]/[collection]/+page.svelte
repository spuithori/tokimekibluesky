<script lang="ts">
    import {page} from "$app/state";
    import {BskyAgent} from "@atproto/api";
    import Infinite from "$lib/components/utils/Infinite.svelte";
    import Record from "$lib/components/viewer/Record.svelte";

    const handle = $derived(page.params.handle);
    const collection = $derived(page.params.collection);
    const endpoint = $derived(page.data.endpoint);
    const _agent = new BskyAgent({service: endpoint});

    let records = $state([]);
    let cursor = $state();

    async function handleLoadMore(loaded, complete) {
        try {
            const { data } = await _agent.com.atproto.repo.listRecords({repo: handle, collection: collection, cursor: cursor});
            cursor = data.cursor;
            records = [...records, ...data.records];

            if (cursor) {
                loaded();
            } else {
                complete();
            }
        } catch (e) {
            console.error(e);
            complete();
        }
    }
</script>

{#if _agent}
    <div class="collections-head">
        <h2 class="collections-head__title">{collection}</h2>

        <dl class="collections-head-list">
            <div class="collections-head-list__item">
                <dt class="collections-head-list__name">Repo</dt>
                <dd class="collections-head-list__content"><a href="/atproto-viewer/{handle}">{handle}</a></dd>
            </div>

            <div class="collections-head-list__item">
                <dt class="collections-head-list__name">Endpoint</dt>
                <dd class="collections-head-list__content">{endpoint}</dd>
            </div>
        </dl>
    </div>

    {#each records as record}
        <Record {record}></Record>
    {/each}

    <Infinite oninfinite={handleLoadMore}></Infinite>
{/if}
