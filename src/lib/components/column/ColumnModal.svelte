<script lang="ts">
    import {_} from 'tokimeki-i18n';
    import {agents, currentTimeline, settings} from '$lib/stores';
    import { tick } from 'svelte';
    import {accountsDb} from '$lib/db';
    import AgentsSelector from "$lib/components/acp/AgentsSelector.svelte";
    import {getColumnState} from "$lib/classes/columnState.svelte";
    import {slotIndexOfColumn} from "$lib/classes/deckLayout";
    import Modal from "$lib/components/ui/Modal.svelte";
    import ColumnCatalog from "$lib/components/column/catalog/ColumnCatalog.svelte";
    import {appState} from "$lib/classes/appState.svelte";
    import {isMobileViewport} from "$lib/viewportQuery.svelte";
    import type {Column} from "$lib/types/column";
    import {addColumnWithIcon} from "$lib/addColumnWithIcon";

    let { onclose } = $props();

    const columns = getColumnState();
    let profileId = appState.profile.current;

    let currentAccount = $state<number | undefined>();
    let addedIds = $state<string[]>([]);
    const lastAdded = $derived(addedIds.length ? columns.columns.find(column => column.id === addedIds[addedIds.length - 1]) : undefined);

    accountsDb.profiles.get(profileId)
        .then(value => {
            if (!value) {
                return false;
            }

            currentAccount = value.primary ?? undefined;
        });

    async function revealLastAdded() {
        if (!lastAdded) {
            return;
        }
        const id = lastAdded.id;
        const slotIndex = slotIndexOfColumn(columns.slots, id);
        if ($settings.design.layout !== 'decks') {
            if (slotIndex !== -1) {
                currentTimeline.set(slotIndex);
            }
            return;
        }
        await tick();
        requestAnimationFrame(() => {
            const el = document.querySelector<HTMLElement>(`[data-flip-id="${CSS.escape(id)}"]`);
            el?.scrollIntoView({ inline: 'center', behavior: 'smooth' });
        });
    }

    function close() {
        onclose();
        revealLastAdded();
    }

    function handleSelect(selected: { id: number | string }) {
        currentAccount = Number(selected.id);
    }

    function handleColumnAdd(column: Column, description?: string) {
        const id = self.crypto.randomUUID();
        addColumnWithIcon(columns, {
            ...column,
            id,
        }, description);
        addedIds = [...addedIds, id];
    }
</script>

{#if ($agents.size > 0)}
    <Modal title={$_('column_settings')} onclose={close}>
        {#if (currentAccount && $agents.size > 1)}
            <div class="column-modal-account">
                <AgentsSelector _agent={$agents.get(currentAccount)} onselect={handleSelect}></AgentsSelector>
            </div>
        {/if}

        {#if currentAccount && $agents.get(currentAccount)}
            {#key currentAccount}
                <ColumnCatalog _agent={$agents.get(currentAccount)} onadd={handleColumnAdd} autofocus={!isMobileViewport.current}></ColumnCatalog>
            {/key}
        {/if}

        {#snippet footer()}
            <div class="column-modal-footer">
                <p class="column-modal-footer__status" aria-live="polite">
                    {#if addedIds.length}
                        <span class="column-modal-footer__count">{$_('catalog_added_count', { count: addedIds.length })}</span>
                        {#if lastAdded}
                            <span class="column-modal-footer__last">{lastAdded.algorithm.name}</span>
                        {/if}
                    {:else}
                        <span class="column-modal-footer__hint">{$_('catalog_footer_hint')}</span>
                    {/if}
                </p>

                <button class="button button--ssl" onclick={close}>
                    {addedIds.length ? $_('catalog_done') : $_('close')}
                </button>
            </div>
        {/snippet}
    </Modal>
{/if}

<style lang="postcss">
    .column-modal-account {
        margin-bottom: 16px;
    }

    .column-modal-footer {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .column-modal-footer__status {
        flex: 1;
        min-width: 0;
        margin: 0;
        font-size: 13px;
        display: flex;
        align-items: baseline;
        gap: 8px;
        overflow: hidden;
    }

    .column-modal-footer__count {
        font-weight: 700;
        color: var(--text-color-1);
        white-space: nowrap;
    }

    .column-modal-footer__last {
        color: var(--text-color-3);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .column-modal-footer__hint {
        color: var(--text-color-3);

        @media (max-width: 767px) {
            display: none;
        }
    }
</style>
