<script lang="ts">
    import { tick } from "svelte";
    import { MediaQuery } from "svelte/reactivity";
    import { watch } from "runed";
    import { _ } from "tokimeki-i18n";
    import Pencil from '@lucide/svelte/icons/pencil';
    import { settings } from "$lib/stores";
    import { riceState } from '$lib/rice/riceState.svelte';
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
    const isEditorHost = $derived(riceState.layoutStyle === 'deck' && !mobileQuery.current);

    let formEl = $state<{ focusEditor: (position?: any) => void; blurEditor: () => void }>();

    watch(() => publishState.focusTick, (focusTick) => {
        if (!focusTick || !isEditorHost) return;
        tick().then(() => formEl?.focusEditor());
    });

    function handleClose() {
        removePublishColumn(columnState);
    }

    function handleEditorHeightChange(height?: number) {
        if (!column) return;
        column.settings.editorHeight = height;
    }
</script>

<div class="publish-column">
    {#if isEditorHost}
        <PublishForm bind:this={formEl} variant="column" float={isFloat} onRequestClose={handleClose} onRequestOpen={() => formEl?.focusEditor()} editorHeight={column?.settings?.editorHeight} onEditorHeightChange={handleEditorHeightChange}></PublishForm>
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
