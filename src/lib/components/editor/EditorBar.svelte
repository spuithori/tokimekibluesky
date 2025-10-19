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
        padding-bottom: 12px;
        padding-inline: 12px;
        justify-content: space-between;

        &__buttons {
            display: flex;
            align-items: center;
            gap: 5px;
            height: 36px;
        }
    }
</style>