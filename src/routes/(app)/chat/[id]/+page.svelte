<script lang="ts">
    import { m } from "$lib/paraglide/messages.js";
    import {page} from "$app/stores";
    import ChatView from "./ChatView.svelte";
    import SettingsHeader from "$lib/components/settings/SettingsHeader.svelte";
    let name = $state();
</script>

<div>
  <SettingsHeader>
    {m.chat()} - {name}
  </SettingsHeader>

  {#key $page.params.id}
    <ChatView id={$page.params.id} bind:name={name}></ChatView>
  {/key}
</div>
