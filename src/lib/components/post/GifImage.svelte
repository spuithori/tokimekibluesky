<script lang="ts">
    import {agent} from "$lib/stores";
    import {onMount} from "svelte";
    import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
    import {BskyAgent} from "@atproto/api";

    let url = '';
    export let did;
    export let _agent = $agent;
    export let blob;
    export let alt = '';
    const __agent = new BskyAgent({service: _agent.service()});

    async function getUrlByBlob(blob) {
        try {
            const cid = blob.ref.toString();
            const res = await __agent.api.com.atproto.sync.getBlob({did: did as string, cid: cid});
            const data = new Blob([res.data], {type: 'image/gif'});

            return URL.createObjectURL(data);
        } catch (e) {
            console.error(e)
        }

        return '';
    }

    onMount(async () => {
        url = await getUrlByBlob(blob);
    })
</script>

<div class="gif-image">
    {#if (url)}
        <img src={url} alt={alt}>
    {:else}
        <div class="gif-image-loading">
            <LoadingSpinner color="var(--text-color-1)" size="32" padding="0"></LoadingSpinner>
        </div>
    {/if}
    <span class="gif-label">GIF</span>
</div>

<style lang="postcss">
    .gif-image {
        position: relative;
        width: 100%;
        height: 100%;

        img {
            width: 100%;
            height: 100%;
        }
    }

    .gif-image-loading {
        width: 100%;
        height: 100%;
        display: grid;
        place-content: center;
        background-color: var(--bg-color-2);
    }
</style>