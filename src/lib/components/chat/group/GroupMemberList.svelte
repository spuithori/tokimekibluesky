<script lang="ts">
    import { _ } from 'svelte-i18n';
    import {toast} from "svelte-sonner";
    import Infinite from "$lib/components/utils/Infinite.svelte";
    import ConfirmModal from "$lib/components/ui/ConfirmModal.svelte";
    import {CHAT_PROXY} from "$lib/components/chat/chatConst";
    import {chatErrorKey} from "$lib/components/chat/chatErrors";
    import {getMemberRole, getMyRole} from "$lib/components/chat/convoUtil";
    import Crown from '@lucide/svelte/icons/crown';
    import UserX from '@lucide/svelte/icons/user-x';

    let { convo, _agent, onconvoupdate = undefined } = $props();
    let members = $state.raw<any[]>([]);
    let cursor = $state('');
    let removeTarget = $state.raw<any>(undefined);

    const myDid = $derived(_agent?.did?.());
    const isOwner = $derived(getMyRole(convo, myDid) === 'owner');

    async function handleLoadMore(loaded, complete) {
        try {
            const res = await _agent.xrpc.get('chat.bsky.convo.getConvoMembers', {convoId: convo.id, limit: 100, cursor: cursor}, {
                headers: {
                    'atproto-proxy': CHAT_PROXY,
                }
            });

            const existingDids = new Set(members.map(member => member.did));
            members = [...members, ...res.members.filter(member => !existingDids.has(member.did))];
            cursor = res.cursor || '';

            if (res.cursor) {
                loaded();
            } else {
                complete();
            }
        } catch (e) {
            console.error(e);
            complete();
        }
    }

    async function removeMember() {
        const target = removeTarget;
        removeTarget = undefined;

        if (!target) {
            return;
        }

        try {
            const res = await _agent.xrpc.post('chat.bsky.group.removeMembers', {convoId: convo.id, members: [target.did]}, {
                headers: {
                    'atproto-proxy': CHAT_PROXY,
                }
            });
            members = members.filter(member => member.did !== target.did);
            onconvoupdate?.(res.convo);
            toast.success($_('chat_group_member_removed'));
        } catch (e) {
            console.error(e);
            toast.error($_(chatErrorKey(e)));
        }
    }
</script>

<div class="group-member-list">
  {#each members as member (member.did)}
    {@const role = getMemberRole(member)}
    <div class="group-member">
      <a class="group-member__avatar" href="/profile/{member.handle}">
        {#if member.avatar}
          <img src={member.avatar} alt="" loading="lazy" width="40" height="40">
        {/if}
      </a>

      <div class="group-member__content">
        <p class="group-member__name">
          {member.displayName || member.handle}

          {#if role === 'owner'}
            <span class="group-member__role">
              <Crown size="12" color="var(--primary-color)"></Crown>
              {$_('chat_group_role_owner')}
            </span>
          {/if}
        </p>
        <p class="group-member__handle">{member.handle}</p>
      </div>

      {#if isOwner && member.did !== myDid}
        <button class="group-member__remove" onclick={() => {removeTarget = member}} aria-label={$_('chat_group_remove_member')}>
          <UserX size="18" color="var(--danger-color)"></UserX>
        </button>
      {/if}
    </div>
  {/each}

  <Infinite oninfinite={handleLoadMore}></Infinite>
</div>

{#if (removeTarget)}
  <ConfirmModal on:ok={removeMember} on:cancel={() => {removeTarget = undefined}} yesText={$_('chat_group_remove_member')} cancelText={$_('cancel')}>
    <p class="group-member-remove-confirm">{$_('chat_group_remove_member_confirm', {values: {name: removeTarget.displayName || removeTarget.handle}})}</p>
  </ConfirmModal>
{/if}

<style lang="postcss">
  .group-member {
      display: grid;
      grid-template-columns: 40px 1fr auto;
      gap: 10px;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid var(--border-color-2);

      &__avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          overflow: hidden;
          background-color: var(--primary-color);
          display: block;

          img {
              width: 100%;
              height: 100%;
              object-fit: cover;
          }
      }

      &__name {
          font-size: 14px;
          font-weight: bold;
          line-height: 1.4;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
      }

      &__role {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          font-size: 11px;
          font-weight: normal;
          color: var(--primary-color);
          border: 1px solid var(--primary-color);
          border-radius: 10px;
          padding: 0 6px;
          height: 18px;
      }

      &__handle {
          font-size: 13px;
          color: var(--text-color-3);
          line-height: 1.4;
      }

      &__remove {
          width: 32px;
          height: 32px;
          display: grid;
          place-content: center;
          border-radius: var(--border-radius-2);

          &:hover {
              background-color: var(--bg-color-2);
          }
      }
  }

  .group-member-remove-confirm {
      margin-bottom: 16px;
  }
</style>
