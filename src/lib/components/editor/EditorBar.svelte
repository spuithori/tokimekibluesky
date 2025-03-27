<script lang="ts">
  import { settings } from '$lib/stores';

  let { top, bottom, isFocus } = $props();
</script>

<div class="publish-toolbar" class:publish-toolbar--vk={!$settings.design?.mobilePostLayoutTop} class:publish-toolbar--focus={isFocus}>
  <div class="publish-toolbar__top">
    {@render top?.()}
  </div>

  <div class="publish-toolbar__bottom">
    {@render bottom?.()}
  </div>
</div>

<style lang="postcss">
    .publish-toolbar {
        display: flex;
        flex-direction: column;
        border-radius: 0 0 var(--border-radius-3) var(--border-radius-3);
        position: sticky;
        bottom: 0;
        z-index: 100;
        padding-bottom: var(--safe-area-bottom);

        @media (max-width: 767px) {
            background: var(--publish-textarea-bg-color);
        }

        &__top,
        &__bottom {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            gap: 5px;
            padding: 0 16px;
            height: 40px;

            @media (max-width: 767px) {
                padding: 0 12px;
            }
        }

        &__top {
            border-bottom: 1px solid var(--border-color-2);
        }

        &__bottom {

        }

        &--vk {
            @media (max-width: 767px) {
                flex-direction: column-reverse;
                border-top: 1px solid var(--border-color-2);

                .publish-toolbar__top {
                    border-bottom: none;
                }

                .publish-toolbar__bottom {
                    flex-direction: row-reverse;
                }
            }
        }

        &--focus {
            padding-bottom: 0;
        }
    }
</style>