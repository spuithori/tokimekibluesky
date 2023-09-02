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
  {#if $agents.size > 1}
    <!-- <div class="side-agents-selector">
      <AgentsSelector on:select={handleAgentSelect}></AgentsSelector>
    </div> -->
  {/if}

  {#key _agent}
    <div class="side-search-content">
      <SearchForm path="/search"></SearchForm>

      <!-- <section class="side-search-users">
        <h3 class="side-title">{$_('suggest_user')}</h3>

        <div class="user-items-list">
          {#each suggests as user}
            <UserItem user={user} {_agent}></UserItem>
          {/each}
        </div>
      </section> -->
    </div>
  {/key}
</div>

<style lang="postcss">
  .side-search {
      padding: 16px;
  }

  .side-search-users {
      margin-top: 15px;
  }
</style>