<script lang="ts">
    import {_} from 'svelte-i18n';
    import {postMutes} from "$lib/stores";
    import SettingsHeader from "$lib/components/settings/SettingsHeader.svelte";

    function deletePostMutes() {
        $postMutes = [];
        localStorage.setItem('postMutes', JSON.stringify([]));
    }
</script>

<svelte:head>
  <title>{$_('settings_data_management')} - TOKIMEKI</title>
</svelte:head>

<div>
  <SettingsHeader>
    {$_('settings_data_management')}
  </SettingsHeader>

  <div class="settings-wrap">
    <p class="settings-description">{$_('import_export_description')}</p>

    <div class="bookmark-import-export bookmark-import-export--export">
      <h2 class="bookmark-import-export__title">{$_('delete_post_mutes')}</h2>
      <p class="bookmark-import-export__description">{$_('delete_post_mutes_description_prefix')}: {$postMutes.length}</p>

      <div class="bookmark-import-export__buttons">
        <button class="button button--danger button--border" onclick={deletePostMutes}>{$_('delete')}</button>
      </div>
    </div>
  </div>
</div>

<style lang="postcss">
  .bookmark-import-export {
      padding: 16px;
      border-radius: var(--border-radius-3);
      box-shadow: 0 0 10px var(--box-shadow-color-1);
      margin-bottom: 20px;

      &__title {
          font-size: 18px;
          margin-bottom: 4px;
      }

      &__description {
          font-size: 14px;
          color: var(--text-color-3);
      }

      &__danger {
          color: var(--danger-color);
          font-weight: bold;
          font-size: 14px;
      }

      &__buttons {
          margin-top: 16px;
      }
  }
</style>