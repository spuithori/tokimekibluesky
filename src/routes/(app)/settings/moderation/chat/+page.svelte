<script lang="ts">
  import {_} from "svelte-i18n";
  import {agent, agents, settings} from "$lib/stores";
  import AgentsSelector from "$lib/components/acp/AgentsSelector.svelte";
  import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
  import {onMount} from "svelte";
  import LabelSelector from "$lib/components/labeler/LabelSelector.svelte";
  import {toast} from "svelte-sonner";

  let _agent = $agent;
  let ready = false;
  let allowInComing;

  $: changeSettings(allowInComing);

  let chatAllowSelections = [
      {
          value: 'all',
          text: $_('chat_allow_all'),
      },
      {
          value: 'following',
          text: $_('chat_allow_following'),
      },
      {
          value: 'none',
          text: $_('chat_allow_none'),
      },
  ];

  async function handleAgentSelect(event) {
      ready = false;
      _agent = event.detail.agent;
      await loadSettings();
      ready = true;
  }

  async function loadSettings() {
      const res = await _agent.agent.app.bsky.actor.getProfile({actor: _agent.did()});
      allowInComing = res.data.associated?.chat?.allowIncoming || 'following';
  }

  async function changeSettings(allowInComing) {
      if (!ready) {
          return false;
      }

      try {
          const res = await _agent.agent.api.com.atproto.repo.putRecord({
              collection: 'chat.bsky.actor.declaration',
              rkey: 'self',
              repo: _agent.did(),
              record: {
                  $type: 'chat.bsky.actor.declaration',
                  allowIncoming: allowInComing
              }
          })
      } catch (e) {
          console.error(e);
          toast.error('Error!');
      }
  }

  onMount(async () => {
      await loadSettings();
      ready = true;
  })
</script>

<div>
  <div class="column-heading">
    <div class="column-heading__buttons">
      <button class="settings-back" on:click={() => {history.back()}}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
      </button>
    </div>

    <h1 class="column-heading__title">{$_('settings_chat')}</h1>

    <div class="column-heading__buttons column-heading__buttons--right">
      <a class="settings-back" href="/">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </a>
    </div>
  </div>

  <div class="settings-wrap">
    <p class="settings-description">{$_('chat_settings_description')}</p>

    <dl class="settings-group settings-group--boxed">
      <dt class="settings-group__name">
        {$_('chat_settings_allow_incoming')}
      </dt>

      <dd class="settings-group__content">
        {#if $agents.size > 1}
          <div class="chat-settings-agent-selector">
            <AgentsSelector on:select={handleAgentSelect}></AgentsSelector>
          </div>
        {/if}

        {#if (ready)}
          <LabelSelector name="gore" bind:value={allowInComing} contentLabelsSelections={chatAllowSelections}></LabelSelector>
        {:else}
          <div class="thread-loading">
            <LoadingSpinner></LoadingSpinner>
          </div>
        {/if}
      </dd>
    </dl>
  </div>
</div>

<style lang="postcss">
  .chat-settings-agent-selector {
      margin-bottom: 10px;
  }
</style>