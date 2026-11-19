<script lang="ts">
    import type { Column } from "$lib/types/column";
    import { iconMap } from "$lib/columnIcons";
    import { AVATAR_ICON, columnAvatarSrc } from "$lib/columnAvatar";
    import ColumnIcon from "$lib/components/column/ColumnIcon.svelte";
    import Plus from '@lucide/svelte/icons/plus';
    import { isHomePlusColumn } from "$lib/homeplus/lifecycle";

    interface Props {
        column?: Column;
        color?: string;
    }

    let { column, color = "var(--deck-heading-icon-color)" }: Props = $props();

    let failedAvatar = $state<string>();

    const avatar = $derived(column?.settings?.icon === AVATAR_ICON ? column.algorithm?.avatar : undefined);
    const CustomIcon = $derived(column?.settings?.icon ? iconMap.get(column.settings.icon) : undefined);
    const isHomePlus = $derived(isHomePlusColumn(column));
</script>

{#snippet icon()}
{#if avatar && avatar !== failedAvatar}
    <img
        class="column-display-avatar"
        src={columnAvatarSrc(avatar)}
        alt=""
        width="24"
        height="24"
        decoding="async"
        onerror={() => {failedAvatar = avatar}}
    >
{:else if CustomIcon}
    <CustomIcon {color} strokeWidth="var(--icon-stroke-width, 2px)"></CustomIcon>
{:else}
    <ColumnIcon type={column?.algorithm?.type} {color}></ColumnIcon>
{/if}
{/snippet}

{#if isHomePlus}
    <span class="column-display-plus">
        {@render icon()}
        <span class="column-display-plus__badge"><Plus size={9} strokeWidth={4} color="var(--on-accent, var(--bg-color-1))"></Plus></span>
    </span>
{:else}
    {@render icon()}
{/if}

<style lang="postcss">
    .column-display-plus {
        position: relative;
        display: grid;
        place-items: center;
    }

    .column-display-plus__badge {
        position: absolute;
        top: -4px;
        right: -4px;
        display: grid;
        place-items: center;
        width: 12px;
        height: 12px;
        border-radius: var(--radius-round, 50%);
        background-color: var(--primary-color);
        pointer-events: none;
    }

    .column-display-avatar {
        display: block;
        width: 24px;
        height: 24px;
        border-radius: var(--feed-avatar-border-radius, 6px);
        object-fit: cover;
    }
</style>
