<script lang="ts">
    import { _ } from 'svelte-i18n';
    import {toast} from "svelte-sonner";
    import Infinite from "$lib/components/utils/Infinite.svelte";
    import ConfirmModal from "$lib/components/ui/ConfirmModal.svelte";
    import ConvoAvatar from "$lib/components/chat/ConvoAvatar.svelte";
    import {CHAT_PROXY} from "$lib/components/chat/chatConst";
    import {chatErrorKey} from "$lib/components/chat/chatErrors";
    import {JOIN_REQUEST_CONVO_TYPE, createNameResolver, getConvoMemberCount, getConvoName, getLastMessagePreview} from "$lib/components/chat/convoUtil";
    import Users from '@lucide/svelte/icons/users';

    let { _agent, onopen = undefined } = $props();
    let requests = $state.raw<any[]>([]);
    let cursor = $state('');
    let declineTarget = $state.raw<any>(undefined);

    function requestKey(request) {
        return request.id || request.convoId;
    }

    async function handleLoadMore(loaded, complete) {
        try {
            const res = await _agent.xrpc.get('chat.bsky.convo.listConvoRequests', {cursor: cursor}, {
                headers: {
                    'atproto-proxy': CHAT_PROXY,
                }
            });

            const existingKeys = new Set(requests.map(requestKey));
            requests = [...requests, ...res.requests.filter(request => !existingKeys.has(requestKey(request)))];
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

    async function accept(convo) {
        try {
            await _agent.xrpc.post('chat.bsky.convo.acceptConvo', {convoId: convo.id}, {
                headers: {
                    'atproto-proxy': CHAT_PROXY,
                }
            });
            requests = requests.filter(request => requestKey(request) !== convo.id);
            _agent.updateChatCount();
            onopen?.({...convo, status: 'accepted'});
        } catch (e) {
            console.error(e);
            toast.error($_(chatErrorKey(e)));
        }
    }

    async function decline() {
        const target = declineTarget;
        declineTarget = undefined;

        if (!target) {
            return;
        }

        try {
            await _agent.xrpc.post('chat.bsky.convo.leaveConvo', {convoId: target.id}, {
                headers: {
                    'atproto-proxy': CHAT_PROXY,
                }
            });
            requests = requests.filter(request => requestKey(request) !== target.id);
            _agent.updateChatCount();
            toast.success($_('chat_request_declined'));
        } catch (e) {
            console.error(e);
            toast.error($_(chatErrorKey(e)));
        }
    }

    async function withdraw(request) {
        try {
            await _agent.xrpc.post('chat.bsky.group.withdrawJoinRequest', {convoId: request.convoId}, {
                headers: {
                    'atproto-proxy': CHAT_PROXY,
                }
            });
            requests = requests.filter(r => requestKey(r) !== request.convoId);
            toast.success($_('chat_join_request_withdrawn'));
        } catch (e) {
            console.error(e);
            toast.error($_(chatErrorKey(e)));
        }
    }
</script>

<div class="chat-requests">
  {#each requests as request (requestKey(request))}
    {#if request.$type === JOIN_REQUEST_CONVO_TYPE}
      <div class="chat-request">
        <div class="chat-request__avatar chat-request__avatar--owner">
          {#if request.owner?.avatar}
            <img src={request.owner.avatar} alt="" loading="lazy" width="46" height="46">
          {/if}
        </div>

        <div class="chat-request__content">
          <p class="chat-request__name">{request.name}</p>

          <p class="chat-request__text">
            <Users size="13" color="var(--text-color-3)"></Users>
            {request.memberCount} ・ {$_('chat_join_request_pending')}
          </p>

          <div class="chat-request__buttons">
            <button class="button button--ss button--border" onclick={() => withdraw(request)}>{$_('chat_join_request_withdraw')}</button>
          </div>
        </div>
      </div>
    {:else if request.id}
      {@const preview = getLastMessagePreview(request, createNameResolver(request, $_('chat_unknown_user')))}
      <div class="chat-request">
        <div class="chat-request__avatar">
          <ConvoAvatar convo={request} {_agent}></ConvoAvatar>
        </div>

        <div class="chat-request__content">
          <button class="chat-request__open" onclick={() => onopen?.(request)}>
            <span class="chat-request__name">
              {getConvoName(request, _agent.did())}

              {#if request.kind}
                <span class="chat-request__members">
                  <Users size="13" color="var(--text-color-3)"></Users>
                  {getConvoMemberCount(request)}
                </span>
              {/if}
            </span>

            {#if preview}
              <span class="chat-request__text">{preview.key ? $_(preview.key, {values: preview.values}) : preview.text}</span>
            {/if}
          </button>

          <div class="chat-request__buttons">
            <button class="button button--ss" onclick={() => accept(request)}>{$_('chat_request_accept')}</button>
            <button class="button button--ss button--border" onclick={() => {declineTarget = request}}>{$_('chat_request_decline')}</button>
          </div>
        </div>
      </div>
    {/if}
  {:else}
    <p class="chat-requests__empty">{$_('chat_requests_empty')}</p>
  {/each}

  <Infinite oninfinite={handleLoadMore}></Infinite>
</div>

{#if (declineTarget)}
  <ConfirmModal on:ok={decline} on:cancel={() => {declineTarget = undefined}} yesText={$_('chat_request_decline')} cancelText={$_('cancel')}>
    <p class="chat-request-decline-confirm">{$_('chat_request_decline_confirm')}</p>
  </ConfirmModal>
{/if}

<style lang="postcss">
  .chat-request {
      display: grid;
      grid-template-columns: 46px 1fr;
      gap: 12px;
      align-items: flex-start;
      border-bottom: 1px solid var(--border-color-2);
      padding: 12px 16px;

      &__avatar {
          width: 46px;
          height: 46px;

          &--owner {
              border-radius: 50%;
              overflow: hidden;
              background-color: var(--primary-color);

              img {
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
              }
          }
      }

      &__open {
          display: block;
          width: 100%;
          text-align: left;
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
      }

      &__name {
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
      }

      &__members {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          color: var(--text-color-3);
          font-size: 13px;
          font-weight: normal;
      }

      &__text {
          color: var(--text-color-3);
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 4px;
          line-height: 1.4;
          overflow: hidden;
          margin-bottom: 8px;
      }

      &__buttons {
          display: flex;
          gap: 8px;
      }
  }

  .chat-requests__empty {
      color: var(--text-color-3);
      font-size: 13px;
      text-align: center;
      padding: 24px 0;
  }

  .chat-request-decline-confirm {
      margin-bottom: 16px;
  }
</style>
