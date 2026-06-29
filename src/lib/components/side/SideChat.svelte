<script lang="ts">
  import {_} from 'svelte-i18n';
  import {agent, agents} from "$lib/stores";
  import AgentsSelector from "$lib/components/acp/AgentsSelector.svelte";
  import ChatListItem from "$lib/components/chat/ChatListItem.svelte";
  import {CHAT_PROXY} from "$lib/components/chat/chatConst";
  import ChatNewModal from "$lib/components/chat/ChatNewModal.svelte";
  import {toast} from "svelte-sonner";
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import Ellipsis from '@lucide/svelte/icons/ellipsis';
  import Inbox from '@lucide/svelte/icons/inbox';
  import MailCheck from '@lucide/svelte/icons/mail-check';
  import MessageCirclePlus from '@lucide/svelte/icons/message-circle-plus';
  import Settings2 from '@lucide/svelte/icons/settings-2';
  import Menu from "$lib/components/ui/Menu.svelte";
  import Infinite from "$lib/components/utils/Infinite.svelte";
  import {settingsState} from "$lib/classes/settingsState.svelte";
  import {isBlockedDirectConvo, getConvoName} from "$lib/components/chat/convoUtil";
  import ChatRequestsList from "$lib/components/chat/ChatRequestsList.svelte";
  import {chatState} from "$lib/classes/chatState.svelte";
  import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
  import {goto} from "$app/navigation";
  import {getColumnState} from "$lib/classes/columnState.svelte";

  const junkColumnState = getColumnState(true);

  let { path }: { path: string } = $props();
  let convos = $state([]);
  let cursor = '';
  let _agent = $state($agent);
  let isModalOpen = $state(false);
  let isMenuOpen = $state(false);
  let currentList: 'convos' | 'requests' = $state('convos');
  let unique = $state(Symbol());
  let id = $derived(path?.split('/').slice(-1)[0]);
  const requestCount = $derived(chatState.getRequestCount(_agent?.did?.()));

  async function handleAgentSelect(event) {
      _agent = event.detail.agent;
      unique = Symbol();
      convos = [];
      cursor = '';
      currentList = 'convos';
  }

  async function handleRefresh(event?) {
      unique = Symbol();
      convos = [];
      cursor = '';
  }

  function handleRequestOpen(convo) {
      if (!junkColumnState.hasColumn('chat_' + convo.id)) {
          junkColumnState.add({
              id: 'chat_' + convo.id,
              algorithm: {
                  id: convo.id,
                  type: 'chat',
                  name: getConvoName(convo, _agent.did()),
              },
              style: 'default',
              settings: {
                  ...defaultDeckSettings,
              },
              did: _agent.did(),
              handle: _agent.handle(),
              data: {
                  feed: [],
                  cursor: '',
              }
          });
      }

      currentList = 'convos';
      handleRefresh();
      goto('/chat/' + convo.id);
  }

  async function updateAllRead() {
    try {
      isMenuOpen = false;
      await _agent.xrpc.post('chat.bsky.convo.updateAllRead', {}, {
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
      const res = await _agent.xrpc.get('chat.bsky.convo.listConvos', {cursor: cursor, status: 'accepted'}, {
        headers: {
          'atproto-proxy': CHAT_PROXY,
        }
      })

      convos = [...convos, ...res.convos];
      cursor = res.cursor;

      if (res.cursor) {
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

  {#if currentList === 'requests'}
    <button class="chat-requests-toggle" onclick={() => {currentList = 'convos'}}>
      <ArrowLeft size="18" color="var(--text-color-1)"></ArrowLeft>
      <span>{$_('chat_request_inbox')}</span>
    </button>

    <ChatRequestsList {_agent} onopen={handleRequestOpen}></ChatRequestsList>
  {:else}
    <button class="chat-requests-toggle" onclick={() => {currentList = 'requests'}}>
      <Inbox size="18" color="var(--text-color-1)"></Inbox>
      <span>{$_('chat_request_inbox')}</span>

      {#if requestCount}
        <span class="chat-requests-toggle__badge">{requestCount}</span>
      {/if}
    </button>

    {#key unique}
      <div class="convo-list">
        {#each convos as convo (convo)}
          {#if !isBlockedDirectConvo(convo, _agent.did())}
            <div class="convo-list__item" class:convo-list__item--current={id === convo.id}>
              <ChatListItem {convo} {_agent} onrefresh={handleRefresh}></ChatListItem>
            </div>
          {/if}
        {/each}
      </div>

      {#if settingsState.pdsRequestReady}
        <Infinite oninfinite={handleLoadMore}></Infinite>
      {/if}
    {/key}
  {/if}
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
      padding: 0 8px 0 16px;
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
    border-top: 1px solid var(--border-color-2);

    &__item {
      &--current {
        background-color: var(--bg-color-2);
      }
    }
  }

  .chat-requests-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    height: 44px;
    padding: 0 16px;
    margin-top: 16px;
    color: var(--text-color-1);
    font-size: 14px;
    font-weight: bold;
    text-align: left;

    &:hover {
      background-color: var(--bg-color-2);
    }

    &__badge {
      margin-left: auto;
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      border-radius: 10px;
      background-color: var(--danger-color);
      color: #fff;
      font-size: 12px;
      font-weight: bold;
      display: grid;
      place-content: center;
    }
  }
</style>