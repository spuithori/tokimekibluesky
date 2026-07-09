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
        gap: 8px;
        flex-shrink: 0;
        padding: 8px 12px;
        justify-content: space-between;
        background: var(--publish-textarea-bg-color, var(--bg-color-1));
        container: publish-toolbar / inline-size;

        &__buttons {
            display: flex;
            align-items: center;
            flex: 1;
            gap: 5px;
            height: 36px;
        }
    }
</style>