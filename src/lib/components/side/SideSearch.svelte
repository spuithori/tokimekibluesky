<script lang="ts">
  import SearchForm from "../../../routes/(app)/SearchForm.svelte";
  import {agent, agents} from "$lib/stores";
  import AgentsSelector from "$lib/components/acp/AgentsSelector.svelte";
  import {_} from "svelte-i18n";
  import {onMount} from "svelte";
  import UserItem from "../../../routes/(app)/profile/[handle]/UserItem.svelte";

  let _agent = $agent;
  let suggests = [];

  async function handleAgentSelect(event) {
      _agent = event.detail.agent;
      await getSuggestUsers();
  }

  async function getSuggestUsers() {
      const sres = await _agent.agent.api.app.bsky.actor.getSuggestions({limit: 20});
      suggests = sres.data.actors;
  }

  onMount(async () => {
      await getSuggestUsers();
  })
</script>

<div class="side-search">
  {#key _agent}
    <div class="side-search-content">
      <SearchForm path="/search"></SearchForm>
    </div>
  {/key}
</div>

<style lang="postcss">
  .side-search {
      padding: 16px;
  }
</style>