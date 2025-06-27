<script lang="ts">
  import { settings } from '$lib/stores';

  let { top, submitArea, isFocus } = $props();
</script>

<div class="publish-toolbar" class:publish-toolbar--vk={!$settings.design?.mobilePostLayoutTop} class:publish-toolbar--focus={isFocus}>
  <div class="publish-toolbar__buttons">
    {@render top?.()}
  </div>

  {@render submitArea?.()}
</div>

<style lang="postcss">
    .publish-toolbar {
        display: flex;
        gap: 4px;
        position: sticky;
        bottom: 0;
        z-index: 100;
        margin: 0 auto;
        padding-bottom: var(--safe-area-bottom);
        padding-inline: 12px;
        justify-content: space-between;

        @media (max-width: 767px) {
            width: fit-content;
            background: var(--publish-textarea-bg-color);
        }

        &__buttons {
            display: flex;
            align-items: center;
            gap: 5px;
            height: 36px;

            @media (max-width: 767px) {
              padding: 8px 12px;
              background-color: var(--bg-color-2);
              border-radius: var(--border-radius-4) var(--border-radius-1) var(--border-radius-1) var(--border-radius-4);
            }
        }

        &--focus {
            padding-bottom: 0;
        }
    }
</style>