<script lang="ts">
    import {page} from "$app/state";
    import {BskyAgent} from "@atproto/api";
    import Record from "$lib/components/viewer/Record.svelte";
    import {onMount} from "svelte";

    const handle = $derived(page.params.handle);
    const collection = $derived(page.params.collection);
    const rkey = $derived(page.params.rkey);
    const endpoint = $derived(page.data.endpoint);
    const _agent = new BskyAgent({service: endpoint});

    let record = $state();

    onMount(async () => {
        if (!handle || !collection || !rkey) {
            return false;
        }

        const { data } = await _agent.com.atproto.repo.getRecord({repo: handle, collection: collection, rkey: rkey});
        record = data.value;
    });
</script>

{#if _agent}
    <div class="collections-head">
        <h2 class="collections-head__title">{rkey}</h2>

        <dl class="collections-head-list">
            <div class="collections-head-list__item">
                <dt class="collections-head-list__name">Collection</dt>
                <dd class="collections-head-list__content"><a href="/atproto-viewer/{handle}/{collection}">{collection}</a></dd>
            </div>

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

    {#if record}
        <Record {record}></Record>
    {/if}
{/if}
