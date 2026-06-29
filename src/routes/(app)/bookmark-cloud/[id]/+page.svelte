<script lang="ts">
    import ArrowLeft from '@lucide/svelte/icons/arrow-left';
    import X from '@lucide/svelte/icons/x';
    import {_} from "svelte-i18n";
    import {page} from "$app/stores";
    import BookmarkView from "./BookmarkView.svelte";
    import PageModal from "$lib/components/ui/PageModal.svelte";
</script>

<PageModal>
  <div class="column-heading">
    <div class="column-heading__buttons">
      <button class="settings-back" onclick={() => {history.back()}}>
        <ArrowLeft color="var(--text-color-1)" />
      </button>
    </div>

    <h2 class="column-heading__title">{$_('bookmark')}</h2>

    <div class="column-heading__buttons column-heading__buttons--right">
      <a class="settings-back" href="/">
        <X color="var(--text-color-1)" />
      </a>
    </div>
  </div>

  {#key $page.params.id}
    <BookmarkView id={$page.params.id}></BookmarkView>
  {/key}
</PageModal>
