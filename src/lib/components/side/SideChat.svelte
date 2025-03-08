<script lang="ts">
  import {_} from 'svelte-i18n';
  import {agent, agents} from "$lib/stores";
  import AgentsSelector from "$lib/components/acp/AgentsSelector.svelte";
  import ChatListItem from "$lib/components/chat/ChatListItem.svelte";
  import {CHAT_PROXY} from "$lib/components/chat/chatConst";
  import ChatNewModal from "$lib/components/chat/ChatNewModal.svelte";
  import {toast} from "svelte-sonner";
  import {Ellipsis, MailCheck, MessageCirclePlus, Settings2} from "lucide-svelte";
  import Menu from "$lib/components/ui/Menu.svelte";
  import Infinite from "$lib/components/utils/Infinite.svelte";

  let convos = $state([]);
  let cursor = '';
  let _agent = $state($agent);
  let isModalOpen = $state(false);
  let isMenuOpen = $state(false);
  let unique = $state(Symbol());

  async function handleAgentSelect(event) {
      _agent = event.detail.agent;
      unique = Symbol();
      convos = [];
      cursor = '';
  }

  async function handleRefresh(event) {
      unique = Symbol();
      convos = [];
      cursor = '';
  }

  async function updateAllRead() {
    try {
      isMenuOpen = false;
      await _agent.agent.chat.bsky.convo.updateAllRead({}, {
        headers: {
          'atproto-proxy': CHAT_PROXY,
        }
      });

      await Promise.all([_agent.updateChatCount(), handleRefresh()]);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleLoadMore(loaded, complete) {
    try {
      const res = await _agent.agent.api.chat.bsky.convo.listConvos({cursor: cursor}, {
        headers: {
          'atproto-proxy': CHAT_PROXY,
        }
      })

      convos = [...convos, ...res.data.convos];
      cursor = res.data.cursor;

      if (res.data.cursor) {
        loaded();
      } else {
        complete();
      }
    } catch (e) {
      console.error(e);
      complete();

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
    <button class="button button--ssl button--soft-rect button--with-icon" onclick={() => {isModalOpen = true}}>
      <MessageCirclePlus size="20"></MessageCirclePlus>
      {$_('start_new_chat')}
    </button>

    <p class="chat-nav-button">
      <a href="/settings/moderation/chat" aria-label="{$_('settings_chat')}">
        <Settings2 size="20" color="var(--text-color-2)"></Settings2>
      </a>
    </p>

    <Menu bind:isMenuOpen={isMenuOpen} buttonClassName="chat-nav-menu-button">
      {#snippet ref()}
        <Ellipsis size="20" color="var(--text-color-2)"></Ellipsis>
      {/snippet}

      {#snippet content()}
        <ul  class="timeline-menu-list">
          <li class="timeline-menu-list__item">
            <button class="timeline-menu-list__button" onclick={updateAllRead}>
              <MailCheck size="18" color="var(--text-color-1)"></MailCheck>
              <span>{$_('chat_update_all_read')}</span>
            </button>
          </li>
        </ul>
      {/snippet}
    </Menu>
  </div>

  {#key unique}
    <div class="convo-list">
      {#each convos as convo, index (convo)}
        {#if !convo.members.filter(member => member.did !== _agent.did())[0]?.viewer?.blocking}
          <ChatListItem {convo} {_agent} onrefresh={handleRefresh}></ChatListItem>
        {/if}
      {/each}
    </div>

    <Infinite oninfinite={handleLoadMore}></Infinite>
  {/key}
</div>

{#if isModalOpen}
  <ChatNewModal {_agent} {convos} onclose={() => {isModalOpen = false}}></ChatNewModal>
{/if}

<style lang="postcss">
  .side-agents-selector {
      margin: 16px;
  }

  .side-chat-nav {
      display: flex;
      align-items: center;
      padding: 0 16px;
      margin-top: 16px;
  }

  .chat-nav-button {
      margin-left: auto;

      a {
          width: 36px;
          height: 36px;
          display: grid;
          place-content: center;
      }
  }

  .convo-list {
      padding: 16px 16px 0;
  }
</style>