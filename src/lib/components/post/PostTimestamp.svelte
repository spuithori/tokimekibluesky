<script lang="ts">
    import { bskyRecordUrl } from '$lib/chotto/chotto';
    import { formatDate } from '$lib/dateFormat';
    import { settings } from '$lib/stores';
    import Tooltip from '$lib/components/ui/Tooltip.svelte';

    interface Props {
        uri: string;
        indexedAt: string;
        relativeTime: string;
        showTooltip?: boolean;
    }

    let { uri, indexedAt, relativeTime, showTooltip = true }: Props = $props();
    const url = $derived(bskyRecordUrl(uri));
    const date = $derived(new Date(indexedAt));
    const label = $derived($settings?.design.absoluteTime
        ? formatDate(date, $settings.design.datetimeFormat || 'yyyy-MM-dd HH:mm')
        : relativeTime);
</script>

{#snippet timestamp()}
    {#if url}
        <a href={url} target="_blank" rel="noopener"><time datetime={indexedAt}>{label}</time></a>
    {:else}
        <time datetime={indexedAt}>{label}</time>
    {/if}
{/snippet}

{#if showTooltip}
    <Tooltip ref={timestamp}>
        {#snippet content()}
            <span aria-hidden="true" class="timeline-tooltip">{formatDate(date, 'yyyy-MM-dd HH:mm:ss')}</span>
        {/snippet}
    </Tooltip>
{:else}
    {@render timestamp()}
{/if}

<style>
    a {
        position: relative;
        z-index: 1;
        color: inherit;
        cursor: pointer;
    }
</style>
