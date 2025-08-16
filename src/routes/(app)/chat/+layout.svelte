<script lang="ts">
    import { m } from "$lib/paraglide/messages.js";
    import type {LayoutData} from "./$types";
    import { ArrowLeft, X } from "lucide-svelte";
    import { scale } from 'svelte/transition';
    import SideChat from "$lib/components/side/SideChat.svelte";

    interface Props {
        data: LayoutData;
        children?: import('svelte').Snippet;
    }

    let { data, children }: Props = $props();
</script>

<div class="settings-modal">
    <div class="settings-modal-content" in:scale={{duration: 250, opacity: 0, start: 0.98}}>
        <div class="settings-column" data-path="{data.pathname}">
            <div class="settings-toc">
                <div class="column-heading only-mobile">
                    <div class="column-heading__buttons">
                        <button class="settings-back" aria-label="Back" onclick={() => {history.back()}}>
                            <ArrowLeft size="24" color="var(--text-color-1)"></ArrowLeft>
                        </button>
                    </div>

                    <h1 class="column-heading__title">{m.chat()}</h1>

                    <div class="column-heading__buttons column-heading__buttons--right">
                        <a class="settings-back" href="/">
                            <X size="24" color="var(--text-color-1)"></X>
                        </a>
                    </div>
                </div>

                <SideChat path={data.pathname}></SideChat>
            </div>

            <div class="settings-content">
                {#key data.pathname}
                    <div class="settings-content-container">
                        {@render children?.()}
                    </div>
                {/key}
            </div>
        </div>
    </div>

    <a class="modal-background-close" aria-hidden="true" href="/"></a>
</div>

<style lang="postcss">
    .settings-column {
        background-color: var(--bg-color-1);
        display: grid;
        grid-template-columns: 320px 1fr;
        height: 100%;

        @media (max-width: 767px) {
            display: block;
        }

        &[data-path='/chat'] {
            .settings-toc {
                @media (max-width: 767px) {
                    display: block;
                    border-right: none;
                    overflow-y: auto;
                    height: 100vh;
                }
            }
        }
    }

    .settings-content {
        min-width: 0;
        height: 100%;
        overflow-y: scroll;

        @media (max-width: 767px) {
            padding-left: 0;
        }
    }

    .settings-toc {
        border-right: 1px solid var(--border-color-2);
        overflow-y: auto;

        @media (max-width: 767px) {
            display: none;
            padding: 0;
        }
    }
</style>