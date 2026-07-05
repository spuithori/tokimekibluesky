<script lang="ts">
    import ArrowLeft from '@lucide/svelte/icons/arrow-left';
    import X from '@lucide/svelte/icons/x';
    import {_} from "tokimeki-i18n";
    import PageModal from "$lib/components/ui/PageModal.svelte";

    let { children } = $props();
</script>

<PageModal>
    <section class="page">
        <div class="column-heading">
            <div class="column-heading__buttons">
                <button class="settings-back" onclick={() => {history.back()}}>
                    <ArrowLeft color="var(--text-color-1)" />
                </button>
            </div>

            <h1 class="column-heading__title">{$_('viewer')}</h1>

            <div class="column-heading__buttons column-heading__buttons--right">
                <a class="settings-back" href="/">
                    <X color="var(--text-color-1)" />
                </a>
            </div>
        </div>

        <div class="timeline">
            {@render children?.()}
        </div>
    </section>
</PageModal>