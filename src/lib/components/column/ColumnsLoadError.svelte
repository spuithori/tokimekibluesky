<script lang="ts">
    import {_} from "tokimeki-i18n";
    import Unplug from '@lucide/svelte/icons/unplug';
    import {getColumnState} from "$lib/classes/columnState.svelte";

    const columnState = getColumnState();
</script>

<div class="columns-load-error">
  <div class="columns-load-error__icon">
    <Unplug size={48} color="var(--danger-color)" />
  </div>

  <h2 class="columns-load-error__title">{$_('columns_load_failed_title')}</h2>
  <p class="columns-load-error__text">{$_('columns_load_failed_description')}</p>

  <div class="columns-load-error__buttons">
    <button class="button button--sm" onclick={() => columnState.loadColumns()}>{$_('retry')}</button>
    <button class="button button--border button--sm" onclick={() => location.reload()}>{$_('boot_error_reload')}</button>
  </div>
</div>

<style lang="postcss">
  .columns-load-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 50px 30px;
      text-align: center;
      color: var(--text-color-2);

      &__title {
          font-size: 16px;
          color: var(--text-color-1);
      }

      &__text {
          font-size: 14px;
      }

      &__buttons {
          display: flex;
          gap: 8px;
          align-items: center;
      }
  }
</style>
