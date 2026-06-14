<script lang="ts">
    import { _ } from 'svelte-i18n';
    import {toast} from "svelte-sonner";
    import Infinite from "$lib/components/utils/Infinite.svelte";
    import {CHAT_PROXY} from "$lib/components/chat/chatConst";
    import {chatErrorKey} from "$lib/components/chat/chatErrors";
    import {intlRelativeTimeFormatState} from "$lib/classes/intlRelativeTimeFormatState.svelte";

    let { convo, _agent, onconvoupdate = undefined } = $props();
    let requests = $state.raw<any[]>([]);
    let cursor = $state('');

    markRead();

    async function markRead() {
        if (!convo?.kind?.unreadJoinRequestCount) {
            return;
        }

        try {
            await _agent.xrpc.post('chat.bsky.group.updateJoinRequestsRead', {convoId: convo.id}, {
                headers: {
                    'atproto-proxy': CHAT_PROXY,
                }
            });
            onconvoupdate?.({...convo, kind: {...convo.kind, unreadJoinRequestCount: 0}});
        } catch (e) {
            console.error(e);
        }
    }

    async function handleLoadMore(loaded, complete) {
        try {
            const res = await _agent.xrpc.get('chat.bsky.group.listJoinRequests', {convoId: convo.id, cursor: cursor}, {
                headers: {
                    'atproto-proxy': CHAT_PROXY,
                }
            });

            const existingDids = new Set(requests.map(request => request.requestedBy?.did));
            requests = [...requests, ...res.requests.filter(request => !existingDids.has(request.requestedBy?.did))];
            cursor = res.cursor || '';

            if (res.cursor) {
                loaded();
            } else {
                complete();
            }
        } catch (e) {
            console.error(e);
            toast.error($_(chatErrorKey(e)));
            complete();
        }
    }

    async function approve(request) {
        try {
            const res = await _agent.xrpc.post('chat.bsky.group.approveJoinRequest', {convoId: convo.id, member: request.requestedBy.did}, {
                headers: {
                    'atproto-proxy': CHAT_PROXY,
                }
            });
            requests = requests.filter(r => r.requestedBy?.did !== request.requestedBy?.did);
            onconvoupdate?.(res.convo);
            toast.success($_('chat_join_request_approved'));
        } catch (e) {
            console.error(e);
            toast.error($_(chatErrorKey(e)));
        }
    }

    async function reject(request) {
        try {
            await _agent.xrpc.post('chat.bsky.group.rejectJoinRequest', {convoId: convo.id, member: request.requestedBy.did}, {
                headers: {
                    'atproto-proxy': CHAT_PROXY,
                }
            });
            requests = requests.filter(r => r.requestedBy?.did !== request.requestedBy?.did);
            toast.success($_('chat_join_request_rejected'));
        } catch (e) {
            console.error(e);
            toast.error($_(chatErrorKey(e)));
        }
    }
</script>

<div class="join-requests">
  {#each requests as request (request.requestedBy?.did)}
    <div class="join-request">
      <a class="join-request__avatar" href="/profile/{request.requestedBy?.handle}">
        {#if request.requestedBy?.avatar}
          <img src={request.requestedBy.avatar} alt="" loading="lazy" width="40" height="40">
        {/if}
      </a>

      <div class="join-request__content">
        <p class="join-request__name">{request.requestedBy?.displayName || request.requestedBy?.handle}</p>
        <p class="join-request__meta">{intlRelativeTimeFormatState.format({ laterDate: new Date(request.requestedAt) })}</p>
      </div>

      <div class="join-request__buttons">
        <button class="button button--ss" onclick={() => approve(request)}>{$_('chat_request_accept')}</button>
        <button class="button button--ss button--border" onclick={() => reject(request)}>{$_('chat_request_decline')}</button>
      </div>
    </div>
  {:else}
    <p class="join-requests__empty">{$_('chat_join_requests_empty')}</p>
  {/each}

  <Infinite oninfinite={handleLoadMore}></Infinite>
</div>

<style lang="postcss">
  .join-request {
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
      }

      &__meta {
          font-size: 12px;
          color: var(--text-color-3);
      }

      &__buttons {
          display: flex;
          gap: 4px;
      }
  }

  .join-requests__empty {
      color: var(--text-color-3);
      font-size: 13px;
      text-align: center;
      padding: 16px 0;
  }
</style>
