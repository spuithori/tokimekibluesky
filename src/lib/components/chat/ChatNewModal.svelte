<script lang="ts">
    import Search from '@lucide/svelte/icons/search';
    import { _ } from 'tokimeki-i18n';
    import Modal from "$lib/components/ui/Modal.svelte";
    import {agent} from "$lib/stores";
    import ListMember from "$lib/components/list/ListMember.svelte";
    import ActorMultiSelect from "$lib/components/chat/ActorMultiSelect.svelte";
    import {CHAT_PROXY} from "$lib/components/chat/chatConst";
    import {chatErrorKey} from "$lib/components/chat/chatErrors";
    import {GROUP_MEMBERS_MAX, GROUP_NAME_CREATE_MAX_GRAPHEMES, getConvoName} from "$lib/components/chat/convoUtil";
    import {RichText} from "$lib/atproto-richtext";
    import {goto} from "$app/navigation";
    import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
    import {toast} from "svelte-sonner";
    import {getColumnState} from "$lib/classes/columnState.svelte";

    let { _agent = $agent, convos, onclose } = $props();
    let mode: 'direct' | 'group' = $state('direct');
    let search = $state('');
    let actors = $state([]);
    let timer;

    let groupName = $state('');
    let groupMembers = $state<any[]>([]);
    let isCreating = $state(false);

    const groupNameLength = $derived(new RichText({text: groupName}).graphemeLength);
    const canCreateGroup = $derived(
        groupNameLength >= 1
        && groupNameLength <= GROUP_NAME_CREATE_MAX_GRAPHEMES
        && groupMembers.length >= 1
        && groupMembers.length <= GROUP_MEMBERS_MAX
        && !isCreating
    );

    const columnState = getColumnState(true);

    async function handleKeyDown() {
        clearTimeout(timer);
        timer = setTimeout(async () => {
            const res = await _agent.xrpc.get('app.bsky.actor.searchActorsTypeahead', {term: search, limit: 10})
            actors = res.actors;
        }, 250);
    }

    function openConvo(convo) {
        if (!columnState.hasColumn('chat_' + convo.id)) {
            columnState.add({
                id: 'chat_' + convo.id,
                algorithm: {
                    id: convo.id,
                    type: 'chat',
                    name: getConvoName(convo, _agent.did()),
                },
                style: 'default',
                settings: {
                    ...defaultDeckSettings,
                    playSound: 'notification1',
                },
                did: _agent.did(),
                handle: _agent.handle(),
                data: {
                    feed: [],
                    cursor: '',
                }
            });
        }

        onclose();
        return goto(`/chat/${convo.id}`);
    }

    async function handleSelect(e) {
        const actor = e.detail.member;

        try {
            const res = await _agent.xrpc.get('chat.bsky.convo.getConvoForMembers',
                {
                    members: [_agent.did(), actor.did as string]
                },
                {
                    headers: {
                        'atproto-proxy': CHAT_PROXY,
                    }
                }
            );

            await openConvo(res.convo);
        } catch (e) {
            if (e.message === 'recipient has disabled incoming messages') {
                toast.error($_('error_chat_incoming_disabled'));
            } else if (e.message === 'Bad token scope') {
                toast.error($_('app_password_scope_error'));
            } else {
                console.error(e);
            }
        }
    }

    async function createGroup() {
        if (!canCreateGroup) {
            return;
        }

        isCreating = true;

        try {
            const res = await _agent.xrpc.post('chat.bsky.group.createGroup', {
                name: groupName,
                members: groupMembers.map(member => member.did),
            }, {
                headers: {
                    'atproto-proxy': CHAT_PROXY,
                }
            });

            await openConvo(res.convo);
        } catch (e) {
            console.error(e);

            if (e.message === 'Bad token scope') {
                toast.error($_('app_password_scope_error'));
            } else {
                toast.error($_(chatErrorKey(e)));
            }
        } finally {
            isCreating = false;
        }
    }
</script>

<Modal title={$_(mode === 'group' ? 'chat_group_create' : 'start_new_chat')} size="fixed" disableState={true} {onclose}>
  <div class="new-chat">
    <div class="new-chat-tabs">
      <button class="new-chat-tabs__button" class:new-chat-tabs__button--active={mode === 'direct'} onclick={() => {mode = 'direct'}}>{$_('chat_tab_direct')}</button>
      <button class="new-chat-tabs__button" class:new-chat-tabs__button--active={mode === 'group'} onclick={() => {mode = 'group'}}>{$_('chat_tab_group')}</button>
    </div>

    {#if mode === 'direct'}
      <div class="new-chat-search">
        <input type="text" class="new-chat-search__input" placeholder={$_('handle_or_name')} bind:value={search} onkeydown={handleKeyDown} autofocus>
        <Search size={20} color="var(--primary-color)" />
      </div>

      {#each actors as member}
        {#if (typeof member !== 'string')}
          <ListMember
                  member={member}
                  action={'chat'}
                  exclude={member?.associated?.chat?.allowIncoming === 'none' || (!member?.viewer?.followedBy && member?.associated?.chat?.allowIncoming === 'following') || !member?.associated?.chat?.allowIncoming}
                  on:add={handleSelect}
          ></ListMember>
        {/if}
      {/each}
    {:else}
      <div class="new-group-name">
        <input type="text" class="new-group-name__input" placeholder={$_('chat_group_name')} bind:value={groupName} maxlength="500">

        <p class="new-group-name__count" class:new-group-name__count--over={groupNameLength > GROUP_NAME_CREATE_MAX_GRAPHEMES}>{groupNameLength} / {GROUP_NAME_CREATE_MAX_GRAPHEMES}</p>
      </div>

      <ActorMultiSelect {_agent} bind:selected={groupMembers} max={GROUP_MEMBERS_MAX}></ActorMultiSelect>

      <div class="new-group-submit">
        <button class="button button--ssl" disabled={!canCreateGroup} onclick={createGroup}>{$_('chat_group_create')}</button>
      </div>
    {/if}
  </div>
</Modal>

<style lang="postcss">
  .new-chat-tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 16px;
      background-color: var(--bg-color-2);
      border-radius: var(--border-radius-2);
      padding: 4px;

      &__button {
          flex: 1;
          height: 36px;
          border-radius: var(--border-radius-2);
          color: var(--text-color-3);
          font-weight: bold;
          font-size: 14px;

          &--active {
              background-color: var(--bg-color-1);
              color: var(--text-color-1);
          }
      }
  }

  .new-chat-search {
      position: relative;
      margin-bottom: 16px;

      &__input {
          border: 1px solid var(--border-color-1);
          background-color: var(--bg-color-2);
          height: 40px;
          border-radius: 20px;
          padding: 0 40px 0 20px;
          color: var(--text-color-1);
          width: 100%;

          &:placeholder-shown {
              color: var(--text-color-3);
          }
      }

      svg {
          position: absolute;
          right: 16px;
          top: 0;
          bottom: 0;
          margin: auto;
          pointer-events: none;
      }
  }

  .new-group-name {
      margin-bottom: 8px;

      &__input {
          border: 1px solid var(--border-color-1);
          background-color: var(--bg-color-2);
          height: 40px;
          border-radius: 20px;
          padding: 0 20px;
          color: var(--text-color-1);
          width: 100%;

          &:placeholder-shown {
              color: var(--text-color-3);
          }
      }

      &__count {
          color: var(--text-color-3);
          font-size: 12px;
          text-align: right;
          margin-top: 4px;

          &--over {
              color: var(--danger-color);
          }
      }
  }

  .new-group-submit {
      margin-top: 16px;
      text-align: center;
  }
</style>
