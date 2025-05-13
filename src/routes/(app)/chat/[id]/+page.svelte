<script lang="ts">
    import {_} from "svelte-i18n";
    import {page} from "$app/stores";
    import ChatView from "./ChatView.svelte";
    import SettingsHeader from "$lib/components/settings/SettingsHeader.svelte";
    let name = $state();
</script>

<div>
  <SettingsHeader>
    {$_('chat')} - {name}
  </SettingsHeader>

  {#key $page.params.id}
    <ChatView id={$page.params.id} bind:name={name}></ChatView>
  {/key}
</div>
