<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import { groupChottoBody, parseChottoBody, type ChottoRef, type ChottoRun } from '$lib/chotto/chotto';
    import { fetchChottoArticle } from '$lib/chotto/mochottApi';

    interface Props {
        chottoRef: ChottoRef;
        did: string;
        url: string;
        onexpand: (runs: ChottoRun[], edited: boolean) => void;
    }

    let { chottoRef, did, url, onexpand }: Props = $props();

    let status = $state<'idle' | 'loading' | 'failed'>('idle');

    async function expand() {
        if (status === 'loading') {
            return;
        }
        status = 'loading';
        const article = await fetchChottoArticle(chottoRef.uri).catch(() => null);
        const blocks = article ? parseChottoBody(article.contentJSON, did) : null;
        if (blocks) {
            status = 'idle';
            onexpand(groupChottoBody(blocks), !!article?.cid && article.cid !== chottoRef.cid);
        } else {
            status = 'failed';
        }
    }
</script>

{#if status === 'failed'}<a class="chotto-more" href={url} target="_blank" rel="noopener">{$_('chotto_read_on_mochott')}</a>{:else}<button class="chotto-more" onclick={expand} disabled={status === 'loading'} aria-busy={status === 'loading'}>{$_('chotto_read_more')}</button>{/if}

<style lang="postcss">
    .chotto-more {
        display: inline;
        padding: 0;
        font: inherit;
        line-height: inherit;
        color: var(--primary-color);
        font-weight: bold;
        cursor: pointer;

        &:hover {
            text-decoration: underline;
        }

        &:disabled {
            cursor: progress;
            opacity: .7;
        }
    }
</style>
