<script lang="ts">
    import {_} from "svelte-i18n";
    import {page} from "$app/stores";
    import ChatView from "./ChatView.svelte";
    import SettingsHeader from "$lib/components/settings/SettingsHeader.svelte";
</script>

<div class="chat-page">
  <SettingsHeader>
    {$_('chat')}
  </SettingsHeader>

  {#key $page.params.id}
    <div class="chat-page__body">
      <ChatView id={$page.params.id}></ChatView>
    </div>
  {/key}
</div>

<style lang="postcss">
  .chat-page {
      height: 100%;
      display: flex;
      flex-direction: column;

      &__body {
          flex: 1;
          min-height: 0;

          :global(.deck-row-wrap) {
              height: 100%;
          }
      }
  }
</style>
