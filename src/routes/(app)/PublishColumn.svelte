<script lang="ts">
    import { tick } from "svelte";
    import { MediaQuery } from "svelte/reactivity";
    import { watch } from "runed";
    import { _ } from "svelte-i18n";
    import Pencil from '@lucide/svelte/icons/pencil';
    import { settings } from "$lib/stores";
    import { getScopedColumnState } from "$lib/classes/columnState.svelte";
    import { publishState } from "$lib/classes/publishState.svelte";
    import { removePublishColumn } from "$lib/publishColumn";
    import PublishForm from "$lib/components/publish/PublishForm.svelte";

    interface Props {
        index: number;
    }

    let { index }: Props = $props();

    const columnState = getScopedColumnState();
    const column = $derived(columnState.getColumn(index));
    const isFloat = $derived(column?.settings?.isPopup === true);
    const mobileQuery = new MediaQuery('(max-width: 767px)');
    const isEditorHost = $derived($settings.design?.layout === 'decks' && !mobileQuery.current);

    let formEl = $state<{ focusEditor: (position?: any) => void; blurEditor: () => void }>();

    watch(() => publishState.focusTick, () => {
        if (!isEditorHost) return;
        tick().then(() => formEl?.focusEditor());
    });

    function handleClose() {
        removePublishColumn(columnState);
    }
</script>

<div class="publish-column">
    {#if isEditorHost}
        <PublishForm bind:this={formEl} variant="column" float={isFloat} onRequestClose={handleClose} onRequestOpen={() => formEl?.focusEditor()}></PublishForm>
    {:else}
        <div class="publish-column__placeholder">
            <button class="button" onclick={() => { publishState.show = true; }}>
                <Pencil size="18"></Pencil>
                {$_('publish_open_composer')}
            </button>
        </div>
    {/if}
</div>

<style lang="postcss">
    .publish-column {
        height: 100%;
    }

    .publish-column__placeholder {
        display: grid;
        place-content: center;
        padding: 32px 16px;

        .button {
            display: flex;
            align-items: center;
            gap: 6px;
        }
    }
</style>
