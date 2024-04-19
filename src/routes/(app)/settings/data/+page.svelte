<script lang="ts">
    import {_} from 'svelte-i18n';
    import { db } from '$lib/db';
    import Dexie from "dexie";
    import {importDB, exportDB, importInto} from "dexie-export-import";
    import { format } from "date-fns";
    import { toast } from "svelte-sonner";
    import {postMutes} from "$lib/stores";

    let bookmarkExportButtonDisabled = false;
    let bookmarkImportButtonDisabled = true;
    let files;

    $: {
        if (files && files[0]) {
            bookmarkImportButtonDisabled = false;
        } else {
            bookmarkImportButtonDisabled = true;
        }
    }

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
  <div class="column-heading">
    <div class="column-heading__buttons">
      <button class="settings-back" on:click={() => {history.back()}}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
      </button>
    </div>

    <h1 class="column-heading__title">{$_('settings_data_management')}</h1>

    <div class="column-heading__buttons column-heading__buttons--right">
      <a class="settings-back" href="/">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </a>
    </div>
  </div>

  <div class="settings-wrap">
    <p class="settings-description">{$_('import_export_description')}</p>

    <div class="bookmark-import-export bookmark-import-export--export">
      <h2 class="bookmark-import-export__title">{$_('bookmark_export')}</h2>
      <p class="bookmark-import-export__description">{$_('bookmark_export_description')}</p>

      <div class="bookmark-import-export__buttons">
        <button class="button" on:click={bookmarkExport} disabled={bookmarkExportButtonDisabled}>{$_('bookmark_export_button')}</button>
      </div>
    </div>

    <div class="bookmark-import-export bookmark-import-export--export">
      <h2 class="bookmark-import-export__title">{$_('bookmark_import')}</h2>
      <p class="bookmark-import-export__description">{$_('bookmark_import_description')}</p>
      <p class="bookmark-import-export__danger">{$_('bookmark_import_warning')}</p>

      <div class="bookmark-import-export__buttons">
        <input class="mb10" type="file" accept=".tokimekib" bind:files>
        <button class="button button--danger button--border" on:click={bookmarkImport} disabled={bookmarkImportButtonDisabled}>{$_('bookmark_import_button')}</button>
      </div>
    </div>

    <div class="bookmark-import-export bookmark-import-export--export">
      <h2 class="bookmark-import-export__title">{$_('delete_post_mutes')}</h2>
      <p class="bookmark-import-export__description">{$_('delete_post_mutes_description_prefix')}: {$postMutes.length}</p>

      <div class="bookmark-import-export__buttons">
        <button class="button button--danger button--border" on:click={deletePostMutes}>{$_('delete')}</button>
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