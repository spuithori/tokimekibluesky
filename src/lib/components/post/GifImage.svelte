<script lang="ts">
    import {agent} from "$lib/stores";
    import {onMount} from "svelte";

    let url = '';
    export let did;
    export let _agent = $agent;
    export let blob;
    export let alt = '';

    async function getUrlByBlob(blob) {
        try {
            const cid = blob.ref.toString();
            const res = await _agent.agent.api.com.atproto.sync.getBlob({did: did as string, cid: cid});
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

{#if (url)}
    <div class="gif-image">
        <img src={url} alt={alt}>
        <span class="gif-label">GIF</span>
    </div>
{/if}

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

    .gif-label {
        position: absolute;
        bottom: 8px;
        left: 8px;
        background-color: rgba(0, 0, 0, .6);
        font-weight: bold;
        font-size: 12px;
        width: 30px;
        height: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        border-radius: var(--border-radius-1);
    }
</style>