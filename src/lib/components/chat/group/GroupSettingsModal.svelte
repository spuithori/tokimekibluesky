<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import Modal from "$lib/components/ui/Modal.svelte";
    import ConfirmModal from "$lib/components/ui/ConfirmModal.svelte";
    import {toast} from "svelte-sonner";
    import {CHAT_PROXY} from "$lib/components/chat/chatConst";
    import {chatErrorKey} from "$lib/components/chat/chatErrors";
    import {RichText} from "$lib/atproto-richtext";
    import {GROUP_NAME_EDIT_MAX_GRAPHEMES, getConvoMemberCount, getMyRole, isConvoLocked, isLockedPermanently} from "$lib/components/chat/convoUtil";
    import GroupMemberList from "$lib/components/chat/group/GroupMemberList.svelte";
    import GroupAddMembers from "$lib/components/chat/group/GroupAddMembers.svelte";
    import GroupJoinLinkSettings from "$lib/components/chat/group/GroupJoinLinkSettings.svelte";
    import GroupJoinRequests from "$lib/components/chat/group/GroupJoinRequests.svelte";
    import Check from '@lucide/svelte/icons/check';
    import Inbox from '@lucide/svelte/icons/inbox';
    import Link2 from '@lucide/svelte/icons/link-2';
    import Lock from '@lucide/svelte/icons/lock';
    import LockOpen from '@lucide/svelte/icons/lock-open';
    import LogOut from '@lucide/svelte/icons/log-out';
    import UserPlus from '@lucide/svelte/icons/user-plus';
    import Users from '@lucide/svelte/icons/users';

    let { convo, _agent, onconvoupdate = undefined, onleave = undefined, onclose } = $props();
    let view: 'main' | 'members' | 'addMembers' | 'joinLink' | 'joinRequests' = $state('main');
    let name = $state(convo?.kind?.name || '');
    let isSaving = $state(false);
    let isLeaveOpen = $state(false);

    const myDid = $derived(_agent?.did?.());
    const isOwner = $derived(getMyRole(convo, myDid) === 'owner');
    const locked = $derived(isConvoLocked(convo));
    const lockedPermanently = $derived(isLockedPermanently(convo));
    const nameLength = $derived(new RichText({text: name}).graphemeLength);
    const canSaveName = $derived(nameLength >= 1 && nameLength <= GROUP_NAME_EDIT_MAX_GRAPHEMES && name !== convo?.kind?.name && !isSaving);

    const TITLE_KEYS = {
        main: 'chat_group_settings',
        members: 'chat_group_members',
        addMembers: 'chat_group_add_members',
        joinLink: 'chat_join_link',
        joinRequests: 'chat_join_requests',
    };

    async function saveName() {
        if (!canSaveName) {
            return;
        }

        isSaving = true;

        try {
            const res = await _agent.xrpc.post('chat.bsky.group.editGroup', {convoId: convo.id, name: name}, {
                headers: {
                    'atproto-proxy': CHAT_PROXY,
                }
            });
            onconvoupdate?.(res.convo);
            toast.success($_('chat_group_name_saved'));
        } catch (e) {
            console.error(e);
            toast.error($_(chatErrorKey(e)));
        } finally {
            isSaving = false;
        }
    }

    async function toggleLock() {
        try {
            const nsid = locked ? 'chat.bsky.convo.unlockConvo' : 'chat.bsky.convo.lockConvo';
            const res = await _agent.xrpc.post(nsid, {convoId: convo.id}, {
                headers: {
                    'atproto-proxy': CHAT_PROXY,
                }
            });
            onconvoupdate?.(res.convo);
            toast.success($_(locked ? 'chat_group_unlocked' : 'chat_group_locked'));
        } catch (e) {
            console.error(e);
            toast.error($_(chatErrorKey(e)));
        }
    }

    async function leaveChat() {
        isLeaveOpen = false;

        try {
            await _agent.xrpc.post('chat.bsky.convo.leaveConvo', {convoId: convo.id}, {
                headers: {
                    'atproto-proxy': CHAT_PROXY,
                }
            });
            toast.success($_('success_leave_chat'));
            onclose();
            onleave?.();
        } catch (e) {
            console.error(e);
            toast.error($_(chatErrorKey(e)));
        }
    }
</script>

<Modal title={$_(TITLE_KEYS[view])} size="fixed" onback={view !== 'main' ? () => {view = 'main'} : undefined} {onclose}>
  {#if view === 'main'}
    <div class="group-settings">
      {#if isOwner && !locked}
        <div class="group-settings-name">
          <input type="text" class="group-settings-name__input" bind:value={name} maxlength="1280" placeholder={$_('chat_group_name')}>

          <button class="button button--ss" disabled={!canSaveName} onclick={saveName} aria-label={$_('chat_group_name_save')}>
            <Check size="18"></Check>
          </button>
        </div>

        <p class="group-settings-name__count" class:group-settings-name__count--over={nameLength > GROUP_NAME_EDIT_MAX_GRAPHEMES}>{nameLength} / {GROUP_NAME_EDIT_MAX_GRAPHEMES}</p>
      {:else}
        <h3 class="group-settings__name">{convo?.kind?.name}</h3>
      {/if}

      <ul class="group-settings-list">
        <li class="group-settings-list__item">
          <button class="group-settings-list__button" onclick={() => {view = 'members'}}>
            <Users size="18" color="var(--text-color-1)"></Users>
            {$_('chat_group_members')}
            <span class="group-settings-list__meta">{getConvoMemberCount(convo)}</span>
          </button>
        </li>

        {#if !locked}
          <li class="group-settings-list__item">
            <button class="group-settings-list__button" onclick={() => {view = 'addMembers'}}>
              <UserPlus size="18" color="var(--text-color-1)"></UserPlus>
              {$_('chat_group_add_members')}
            </button>
          </li>
        {/if}

        {#if isOwner}
          <li class="group-settings-list__item">
            <button class="group-settings-list__button" onclick={() => {view = 'joinLink'}}>
              <Link2 size="18" color="var(--text-color-1)"></Link2>
              {$_('chat_join_link')}
            </button>
          </li>

          <li class="group-settings-list__item">
            <button class="group-settings-list__button" onclick={() => {view = 'joinRequests'}}>
              <Inbox size="18" color="var(--text-color-1)"></Inbox>
              {$_('chat_join_requests')}

              {#if convo?.kind?.unreadJoinRequestCount}
                <span class="group-settings-list__badge">{convo.kind.unreadJoinRequestCount}</span>
              {:else if convo?.kind?.joinRequestCount}
                <span class="group-settings-list__meta">{convo.kind.joinRequestCount}</span>
              {/if}
            </button>
          </li>

          {#if !lockedPermanently}
            <li class="group-settings-list__item">
              <button class="group-settings-list__button" onclick={toggleLock}>
                {#if locked}
                  <LockOpen size="18" color="var(--text-color-1)"></LockOpen>
                  {$_('chat_group_unlock')}
                {:else}
                  <Lock size="18" color="var(--text-color-1)"></Lock>
                  {$_('chat_group_lock')}
                {/if}
              </button>
            </li>
          {/if}
        {/if}

        <li class="group-settings-list__item">
          <button class="group-settings-list__button group-settings-list__button--danger" onclick={() => {isLeaveOpen = true}}>
            <LogOut size="18" color="var(--danger-color)"></LogOut>
            {$_('chat_menu_leave')}
          </button>
        </li>
      </ul>

      {#if isOwner && !locked}
        <p class="group-settings__note">{$_('chat_group_owner_leave_note')}</p>
      {/if}
    </div>
  {:else if view === 'members'}
    <GroupMemberList {convo} {_agent} {onconvoupdate}></GroupMemberList>
  {:else if view === 'addMembers'}
    <GroupAddMembers {convo} {_agent} {onconvoupdate} ondone={() => {view = 'main'}}></GroupAddMembers>
  {:else if view === 'joinLink'}
    <GroupJoinLinkSettings {convo} {_agent} {onconvoupdate}></GroupJoinLinkSettings>
  {:else if view === 'joinRequests'}
    <GroupJoinRequests {convo} {_agent} {onconvoupdate}></GroupJoinRequests>
  {/if}
</Modal>

{#if (isLeaveOpen)}
  <ConfirmModal on:ok={leaveChat} on:cancel={() => {isLeaveOpen = false}} yesText={$_('chat_menu_leave')} cancelText={$_('cancel')}>
    <p class="group-leave-confirm">{$_('chat_group_leave_confirm')}</p>
  </ConfirmModal>
{/if}

<style lang="postcss">
  .group-settings {
      &__name {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 8px;
          overflow-wrap: anywhere;
      }

      &__note {
          color: var(--text-color-3);
          font-size: 12px;
          margin-top: 16px;
          line-height: 1.5;
      }
  }

  .group-settings-name {
      display: flex;
      gap: 8px;
      align-items: center;

      &__input {
          border: 1px solid var(--border-color-1);
          background-color: var(--bg-color-2);
          height: 40px;
          border-radius: 20px;
          padding: 0 20px;
          color: var(--text-color-1);
          flex: 1;
          min-width: 0;
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

  .group-settings-list {
      list-style: none;
      margin-top: 16px;

      &__item {
          border-bottom: 1px solid var(--border-color-2);
      }

      &__button {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          height: 48px;
          color: var(--text-color-1);
          font-size: 14px;
          text-align: left;

          &--danger {
              color: var(--danger-color);
          }
      }

      &__meta {
          margin-left: auto;
          color: var(--text-color-3);
          font-size: 13px;
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

  .group-leave-confirm {
      margin-bottom: 16px;
  }
</style>
