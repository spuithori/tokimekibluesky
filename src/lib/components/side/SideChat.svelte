<script lang="ts">
  import {_} from 'svelte-i18n';
  import {onMount} from "svelte";
  import {agent, agents} from "$lib/stores";
  import AgentsSelector from "$lib/components/acp/AgentsSelector.svelte";
  import ChatListItem from "$lib/components/chat/ChatListItem.svelte";
  import {CHAT_PROXY} from "$lib/components/chat/chatConst";
  import ChatNewModal from "$lib/components/chat/ChatNewModal.svelte";
  import {toast} from "svelte-sonner";
  import {MessageCirclePlus, Settings2} from "lucide-svelte";

  let convos = $state([]);
  let _agent = $state($agent);
  let isModalOpen = $state(false);

  async function handleAgentSelect(event) {
      _agent = event.detail.agent;
      convos = [];
      await loadConvos();
  }

  async function handleRefresh(event) {
      convos = [];
      await loadConvos();
  }

  onMount(async () => {
      await loadConvos();
  });

  async function loadConvos() {
      try {
          const res = await _agent.agent.api.chat.bsky.convo.listConvos({}, {
              headers: {
                  'atproto-proxy': CHAT_PROXY,
              }
          })

          convos = res.data.convos;
      } catch (e) {
          console.error(e);

          if (e.message === 'Bad token scope') {
              toast.error($_('app_password_scope_error'));
          }
      }
  }
</script>

<div class="side-chat">
  {#if $agents.size > 1}
    <div class="side-agents-selector">
      <AgentsSelector on:select={handleAgentSelect}></AgentsSelector>
    </div>
  {/if}

  <div class="side-chat-nav">
    <p class="chat-settings-text">
      <a href="/settings/moderation/chat" aria-label="{$_('settings_chat')}">
        <Settings2 size="20" color="var(--text-color-2)"></Settings2>
      </a>
    </p>

    <button class="button button--ssl button--soft-rect button--with-icon" onclick={() => {isModalOpen = true}}>
      <MessageCirclePlus size="20"></MessageCirclePlus>
      {$_('start_new_chat')}
    </button>
  </div>

  {#key _agent}
    <div class="convo-list">
      {#each convos as convo, index (convo)}
        {#if !convo.members.filter(member => member.did !== _agent.did())[0]?.viewer?.blocking}
          <ChatListItem {convo} {_agent} on:refresh={handleRefresh}></ChatListItem>
        {/if}
      {/each}
    </div>
  {/key}
</div>

{#if isModalOpen}
  <ChatNewModal {_agent} {convos} on:close={() => {isModalOpen = false}}></ChatNewModal>
{/if}

<style lang="postcss">
  .side-agents-selector {
      margin: 16px;
  }

  .side-chat-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      margin-top: 16px;
  }

  .chat-settings-text {
      a {
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--text-color-2);
      }
  }

  .convo-list {
      padding: 16px;
  }
</style>