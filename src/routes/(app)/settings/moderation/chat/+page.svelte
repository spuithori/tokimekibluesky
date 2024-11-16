<script lang="ts">
  import { run } from 'svelte/legacy';

  import {_} from "svelte-i18n";
  import {agent, agents, settings} from "$lib/stores";
  import AgentsSelector from "$lib/components/acp/AgentsSelector.svelte";
  import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
  import {onMount} from "svelte";
  import LabelSelector from "$lib/components/labeler/LabelSelector.svelte";
  import {toast} from "svelte-sonner";
  import SettingsHeader from "$lib/components/settings/SettingsHeader.svelte";

  let _agent = $agent;
  let ready = $state(false);
  let allowInComing = $state();


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
  run(() => {
    changeSettings(allowInComing);
  });
</script>

<div>
  <SettingsHeader>
    {$_('settings_chat')}
  </SettingsHeader>

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