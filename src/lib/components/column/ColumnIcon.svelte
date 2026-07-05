<script lang="ts">
    import { getColumnKind } from '$lib/columnKindRegistry.svelte';

    interface Props {
        type?: string;
        color?: string;
        size?: number;
    }

    let { type = "home", color = "var(--deck-heading-icon-color)", size = undefined }: Props =
        $props();

    const strokeWidth = "var(--icon-stroke-width, 2px)";
    const Icon = $derived(getColumnKind(type)?.icon);
</script>

{#if Icon}
    <Icon {color} {strokeWidth} {size} />
{/if}
