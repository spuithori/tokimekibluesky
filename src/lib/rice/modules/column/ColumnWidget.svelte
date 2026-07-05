<script lang="ts">
    import { agent } from '$lib/stores';
    import { capabilityOf } from '$lib/columnKinds';
    import RiceWidgetLogin from '$lib/components/rice/RiceWidgetLogin.svelte';
    import ColumnWidgetHost from './ColumnWidgetHost.svelte';
    import type { JunkColumnDescriptor } from '$lib/junkColumn';

    interface Props {
        options?: Record<string, string>;
        item?: string;
    }

    let { options = {}, item = 'column' }: Props = $props();

    const type = $derived(options.type ?? '');
    const height = $derived(options.height ?? '480px');
    const needsAgent = $derived(capabilityOf(type).hasAgent);
    const source = $derived(options.uri ?? options.query ?? '');
    const contentKey = $derived([type, source, options.did ?? '', options.name ?? ''].join('|'));
    const descriptor = $derived.by((): JunkColumnDescriptor | null => {
        if (!type) return null;
        return {
            id: `rice-widget-${item}`,
            algorithm: {
                type: type as any,
                ...(source ? { algorithm: source } : {}),
                name: options.name ?? '',
            },
            did: options.did ?? ($agent ? $agent.did() : ''),
        };
    });
</script>

{#if descriptor}
    <div class="rice-widget-column" style:height>
        {#if needsAgent && !$agent}
            <RiceWidgetLogin></RiceWidgetLogin>
        {:else}
            {#key contentKey}
                <ColumnWidgetHost {descriptor} _agent={$agent}></ColumnWidgetHost>
            {/key}
        {/if}
    </div>
{/if}

<style>
    .rice-widget-column {
        position: relative;
        overflow-y: auto;
        overscroll-behavior-y: contain;
        border-radius: var(--border-radius-2);

        @supports (-moz-appearance: none) {
            scrollbar-color: var(--scroll-bar-color) var(--scroll-bar-bg-color);
            scrollbar-width: thin;
        }

        &::-webkit-scrollbar {
            width: 6px;
        }

        &::-webkit-scrollbar-thumb {
            background: var(--scroll-bar-color);
            border-radius: var(--scroll-bar-border-radius, 3px);
        }

        &::-webkit-scrollbar-track {
            background: var(--scroll-bar-bg-color);
        }
    }

    .rice-widget-column :global(.deck-heading) {
        display: none;
    }
</style>
