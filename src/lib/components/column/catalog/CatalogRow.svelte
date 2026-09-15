<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import Plus from '@lucide/svelte/icons/plus';
    import Check from '@lucide/svelte/icons/check';
    import Pin from '@lucide/svelte/icons/pin';
    import CloudUpload from '@lucide/svelte/icons/cloud-upload';
    import IconColumnsEdit from "$lib/icons/columns/IconColumnsEdit.svelte";
    import ColumnIcon from "$lib/components/column/ColumnIcon.svelte";
    import type { CatalogItem } from "./columnCatalog";

    interface Props {
        item: CatalogItem;
        added: number;
        onadd: (item: CatalogItem) => void;
        onedit?: (item: CatalogItem) => void;
        onmigrate?: (item: CatalogItem) => void;
        migrating?: boolean;
    }

    let { item, added, onadd, onedit, onmigrate, migrating = false }: Props = $props();

    let flashing = $state(false);

    function add() {
        onadd(item);
        flashing = false;
        requestAnimationFrame(() => {
            flashing = true;
        });
    }
</script>

<div class="catalog-row" class:catalog-row--added={added > 0} class:catalog-row--flash={flashing} onanimationend={() => (flashing = false)}>
    <button class="catalog-row__main" type="button" onclick={add} aria-label="{$_('column_add_row')}: {item.column.algorithm.name}">
        <span class="catalog-row__icon" class:catalog-row__icon--avatar={Boolean(item.avatar)}>
            {#if item.avatar}
                <img src={item.avatar} alt="" loading="lazy" decoding="async" width="36" height="36">
            {:else}
                <ColumnIcon type={item.column.algorithm.type} color="var(--text-color-1)"></ColumnIcon>
            {/if}
        </span>

        <span class="catalog-row__text">
            <span class="catalog-row__name">{item.column.algorithm.name}</span>
            {#if item.pinned || item.subtitle}
                <span class="catalog-row__meta">
                    {#if item.pinned}
                        <span class="catalog-row__pin"><Pin size={11} color="currentColor" strokeWidth={2.5} />{$_('catalog_pinned')}</span>
                    {/if}
                    {#if item.subtitle}
                        <span class="catalog-row__subtitle">{item.subtitle}</span>
                    {/if}
                </span>
            {/if}
        </span>
    </button>

    <span class="catalog-row__actions">
        {#if item.migratable && onmigrate}
            <button class="catalog-row__tool" type="button" onclick={() => onmigrate?.(item)} disabled={migrating} aria-label={$_('migrate_to_cloud_list')} title={$_('migrate_to_cloud_list')}>
                <CloudUpload size={18} color="var(--primary-color)" />
            </button>
        {/if}

        {#if item.editable && onedit}
            <button class="catalog-row__tool" type="button" onclick={() => onedit?.(item)} aria-label={$_('edit')} title={$_('edit')}>
                <IconColumnsEdit></IconColumnsEdit>
            </button>
        {/if}

        {#if added > 0}
            <span class="catalog-row__added" aria-label="{$_('catalog_added')}">
                <Check size={13} color="var(--bg-color-1)" strokeWidth={3} />
                {#if added > 1}
                    <span class="catalog-row__added-count">{added}</span>
                {/if}
            </span>
        {/if}

        <button class="catalog-row__add" type="button" onclick={add} aria-label="{$_('column_add_row')}: {item.column.algorithm.name}">
            <Plus size={18} color="currentColor" strokeWidth={2.5} />
        </button>
    </span>
</div>

<style lang="postcss">
    .catalog-row {
        --row-radius: var(--border-radius-4);

        position: relative;
        display: flex;
        align-items: center;
        gap: 4px;
        min-height: 56px;
        padding: 6px 8px 6px 6px;
        border-radius: var(--row-radius);
        background-color: var(--bg-color-1);
        border: 1px solid var(--border-color-2);
        transition: border-color .15s ease, background-color .15s ease, transform .15s ease;
        min-width: 0;

        &:hover {
            border-color: var(--primary-color);
        }

        &--added {
            background-color: color-mix(in srgb, var(--primary-color) 6%, var(--bg-color-1));
        }

        &--flash {
            animation: catalog-row-flash .55s ease-out;
        }
    }

    .catalog-row__main {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
        text-align: left;
        padding: 2px 0;
        border-radius: var(--row-radius);
        color: var(--text-color-1);
    }

    .catalog-row__icon {
        flex-shrink: 0;
        width: 40px;
        height: 40px;
        border-radius: 12px;
        display: grid;
        place-items: center;
        background-color: var(--bg-color-2);
        overflow: hidden;

        &--avatar {
            background-color: transparent;
        }

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
    }

    .catalog-row__text {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
    }

    .catalog-row__name {
        font-size: 14px;
        font-weight: 700;
        line-height: 1.3;
        letter-spacing: .01em;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .catalog-row__meta {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        line-height: 1.2;
        color: var(--text-color-3);
        min-width: 0;
    }

    .catalog-row__pin {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        color: var(--primary-color);
        font-weight: 600;
        flex-shrink: 0;
    }

    .catalog-row__subtitle {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .catalog-row__actions {
        display: flex;
        align-items: center;
        gap: 2px;
        flex-shrink: 0;
    }

    .catalog-row__tool {
        width: 32px;
        height: 32px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        transition: background-color .15s ease;

        &:hover {
            background-color: var(--bg-color-2);
        }

        &:disabled {
            opacity: .5;
        }
    }

    .catalog-row__added {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        height: 22px;
        min-width: 22px;
        padding: 0 5px;
        border-radius: 11px;
        background-color: var(--primary-color);
        color: var(--bg-color-1);
        font-size: 12px;
        font-weight: 700;
        animation: catalog-badge-in .3s cubic-bezier(.34, 1.56, .64, 1) both;
    }

    .catalog-row__added-count {
        line-height: 1;
    }

    .catalog-row__add {
        width: 34px;
        height: 34px;
        margin-left: 4px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        border: 1.5px solid var(--primary-color);
        color: var(--primary-color);
        transition: background-color .15s ease, color .15s ease, transform .1s ease;

        &:hover {
            background-color: var(--primary-color);
            color: var(--bg-color-1);
        }

        &:active {
            transform: scale(.92);
        }
    }

    @keyframes catalog-row-flash {
        0% {
            background-color: color-mix(in srgb, var(--primary-color) 22%, var(--bg-color-1));
            transform: scale(1.01);
        }
        100% {
            background-color: color-mix(in srgb, var(--primary-color) 6%, var(--bg-color-1));
            transform: scale(1);
        }
    }

    @keyframes catalog-badge-in {
        from {
            transform: scale(.4);
            opacity: 0;
        }
        to {
            transform: scale(1);
            opacity: 1;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .catalog-row--flash,
        .catalog-row__added {
            animation: none;
        }
    }
</style>
