<script lang="ts">
  import { run } from 'svelte/legacy';

    import {_} from 'svelte-i18n';
    import { db } from '$lib/db';
    import Dexie from "dexie";
    import {importDB, exportDB, importInto} from "dexie-export-import";
    import { format } from "date-fns";
    import { toast } from "svelte-sonner";
    import {postMutes} from "$lib/stores";
  import SettingsHeader from "$lib/components/settings/SettingsHeader.svelte";

    let bookmarkExportButtonDisabled = $state(false);
    let bookmarkImportButtonDisabled = $state(true);
    let files = $state();

    run(() => {
        if (files && files[0]) {
            bookmarkImportButtonDisabled = false;
        } else {
            bookmarkImportButtonDisabled = true;
        }
    });

    async function bookmarkExport() {
        const blob = await exportDB(db);
        console.log(blob);

        let link = document.createElement('a');
        link.download = 'export-' + format(Date.now(), 'yyyy-MM-dd')  + '.tokimekib';
        link.href = URL.createObjectURL(blob);
        link.click();

        URL.revokeObjectURL(link.href);

        bookmarkExportButtonDisabled = true;
    }

    async function bookmarkImport() {
        try {
            bookmarkImportButtonDisabled = true;
            await importInto(db, files[0], {
                overwriteValues: true,
                acceptNameDiff: false,
                acceptMissingTables: false,
                clearTablesBeforeImport: true,
            });
            toast.success($_('bookmark_import_success'));
        } catch (e) {
            console.error(e);
            toast.error($_('bookmark_import_error'));
        }

        files = undefined;
        bookmarkImportButtonDisabled = false;
    }

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
      <h2 class="bookmark-import-export__title">{$_('bookmark_export')}</h2>
      <p class="bookmark-import-export__description">{$_('bookmark_export_description')}</p>

      <div class="bookmark-import-export__buttons">
        <button class="button" onclick={bookmarkExport} disabled={bookmarkExportButtonDisabled}>{$_('bookmark_export_button')}</button>
      </div>
    </div>

    <div class="bookmark-import-export bookmark-import-export--export">
      <h2 class="bookmark-import-export__title">{$_('bookmark_import')}</h2>
      <p class="bookmark-import-export__description">{$_('bookmark_import_description')}</p>
      <p class="bookmark-import-export__danger">{$_('bookmark_import_warning')}</p>

      <div class="bookmark-import-export__buttons">
        <input class="mb10" type="file" accept=".tokimekib" bind:files>
        <button class="button button--danger button--border" onclick={bookmarkImport} disabled={bookmarkImportButtonDisabled}>{$_('bookmark_import_button')}</button>
      </div>
    </div>

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