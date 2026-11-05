<script lang="ts">
    import type { Snippet } from 'svelte';
    import { _ } from 'tokimeki-i18n';
    import type { ChottoRun } from '$lib/chotto/chotto';

    interface Props {
        runs: ChottoRun[];
        edited?: boolean;
        imageCover?: Snippet;
    }

    let { runs, edited = false, imageCover }: Props = $props();
</script>

<div class="chotto-body">
    {#each runs as run, i (i)}
        {#if run.kind === 'text'}
            <p class="timeline__text" dir="auto">{#each run.segments as segment, j (j)}{#if segment.href}<a href={segment.href} target="_blank" rel="noopener nofollow noreferrer">{segment.text}</a>{:else}{segment.text}{/if}{/each}</p>
        {:else if run.kind === 'card'}
            <p class="timeline__text" dir="auto"><a href={run.url} target="_blank" rel="noopener nofollow noreferrer">{run.title || run.url}</a></p>
        {:else}
            <div class="chotto-body__media" class:chotto-body__media--covered={!!imageCover}>
                {@render imageCover?.()}
                <img class="chotto-body__image" src={run.src} alt={run.alt} width={run.width} height={run.height} loading="lazy" decoding="async">
            </div>
        {/if}
    {/each}
    {#if edited}
        <p class="chotto-body__edited">{$_('chotto_edited')}</p>
    {/if}
</div>

<style lang="postcss">
    .chotto-body {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .chotto-body__edited {
        font-size: 13px;
        color: var(--text-color-3);
    }

    .chotto-body__media {
        position: relative;

        &--covered {
            min-height: 120px;
        }
    }

    .chotto-body__image {
        display: block;
        max-width: 100%;
        height: auto;
        border-radius: var(--radius-media, 6px);
    }
</style>
