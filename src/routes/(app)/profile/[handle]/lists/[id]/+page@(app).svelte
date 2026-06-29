<script lang="ts">
    import ArrowLeft from '@lucide/svelte/icons/arrow-left';
    import X from '@lucide/svelte/icons/x';
    import {_} from "svelte-i18n";
    import { page } from '$app/stores';
    import ListView from "./ListView.svelte";
    import PageModal from "$lib/components/ui/PageModal.svelte";

    let title = $state('');
</script>

<PageModal>
  <div class="column-heading">
    <div class="column-heading__buttons">
      <button class="settings-back" onclick={() => {history.back()}}>
        <ArrowLeft color="var(--text-color-1)" />
      </button>
    </div>

    <h1 class="column-heading__title">{$_('lists')} - {title}</h1>

    <div class="column-heading__buttons column-heading__buttons--right">
      <a class="settings-back" href="/">
        <X color="var(--text-color-1)" />
      </a>
    </div>
  </div>

  {#key $page.params.id}
    <ListView id={$page.params.id} handle={$page.params.handle} bind:title={title}></ListView>
  {/key}
</PageModal>