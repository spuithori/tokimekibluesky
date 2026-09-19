<script lang="ts">
    import type { Column } from "$lib/types/column";
    import { iconMap } from "$lib/columnIcons";
    import { AVATAR_ICON, columnAvatarSrc } from "$lib/columnAvatar";
    import ColumnIcon from "$lib/components/column/ColumnIcon.svelte";

    interface Props {
        column?: Column;
        color?: string;
    }

    let { column, color = "var(--deck-heading-icon-color)" }: Props = $props();

    let failedAvatar = $state<string>();

    const avatar = $derived(column?.settings?.icon === AVATAR_ICON ? column.algorithm?.avatar : undefined);
    const CustomIcon = $derived(column?.settings?.icon ? iconMap.get(column.settings.icon) : undefined);
</script>

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

<style lang="postcss">
    .column-display-avatar {
        display: block;
        width: 24px;
        height: 24px;
        border-radius: 6px;
        object-fit: cover;
    }
</style>
