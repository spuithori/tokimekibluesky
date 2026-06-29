<script lang="ts">
    import { _ } from 'svelte-i18n';
    import {page} from "$app/stores";
    import {agent} from "$lib/stores";
    import {goto} from "$app/navigation";
    import {toast} from "svelte-sonner";
    import SettingsHeader from "$lib/components/settings/SettingsHeader.svelte";
    import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
    import {CHAT_PROXY} from "$lib/components/chat/chatConst";
    import {chatErrorKey} from "$lib/components/chat/chatErrors";
    import {JOIN_LINK_PREVIEW_TYPE, JOIN_LINK_PREVIEW_DISABLED_TYPE, getConvoName} from "$lib/components/chat/convoUtil";
    import {getColumnState} from "$lib/classes/columnState.svelte";
    import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
    import Users from '@lucide/svelte/icons/users';

    const junkColumnState = getColumnState(true);
    const code = $page.params.code;

    let preview = $state.raw<any>(undefined);
    let isLoading = $state(true);
    let isJoining = $state(false);
    let pending = $state(false);

    loadPreview();

    async function loadPreview() {
        isLoading = true;

        try {
            const res = await $agent.xrpc.get('chat.bsky.group.getJoinLinkPreviews', {codes: [code]}, {
                headers: {
                    'atproto-proxy': CHAT_PROXY,
                }
            });
            preview = res.joinLinkPreviews?.[0];
            pending = !!preview?.viewer?.requestedAt;
        } catch (e) {
            console.error(e);
        } finally {
            isLoading = false;
        }
    }

    function openConvo(convo) {
        if (!junkColumnState.hasColumn('chat_' + convo.id)) {
            junkColumnState.add({
                id: 'chat_' + convo.id,
                algorithm: {
                    id: convo.id,
                    type: 'chat',
                    name: getConvoName(convo, $agent.did()),
                },
                style: 'default',
                settings: {
                    ...defaultDeckSettings,
                },
                did: $agent.did(),
                handle: $agent.handle(),
                data: {
                    feed: [],
                    cursor: '',
                }
            });
        }

        return goto('/chat/' + convo.id);
    }

    async function join() {
        isJoining = true;

        try {
            const res = await $agent.xrpc.post('chat.bsky.group.requestJoin', {code: code}, {
                headers: {
                    'atproto-proxy': CHAT_PROXY,
                }
            });

            if (res.status === 'joined' && res.convo) {
                await openConvo(res.convo);
            } else {
                pending = true;
                toast.success($_('chat_join_request_sent'));
            }
        } catch (e) {
            console.error(e);
            toast.error($_(chatErrorKey(e)));
        } finally {
            isJoining = false;
        }
    }

    async function withdraw() {
        try {
            await $agent.xrpc.post('chat.bsky.group.withdrawJoinRequest', {convoId: preview.convoId}, {
                headers: {
                    'atproto-proxy': CHAT_PROXY,
                }
            });
            pending = false;
            toast.success($_('chat_join_request_withdrawn'));
        } catch (e) {
            console.error(e);
            toast.error($_(chatErrorKey(e)));
        }
    }
</script>

<div>
  <SettingsHeader>
    {$_('chat_join_link')}
  </SettingsHeader>

  <div class="join-page">
    {#if isLoading}
      <LoadingSpinner></LoadingSpinner>
    {:else if preview?.$type === JOIN_LINK_PREVIEW_TYPE}
      <div class="join-page-card">
        <div class="join-page-card__avatar">
          {#if preview.owner?.avatar}
            <img src={preview.owner.avatar} alt="" loading="lazy" width="64" height="64">
          {/if}
        </div>

        <h2 class="join-page-card__name">{preview.name}</h2>

        <p class="join-page-card__meta">
          <Users size="14" color="var(--text-color-3)"></Users>
          <span>{preview.memberCount} / {preview.memberLimit}</span>
        </p>

        <p class="join-page-card__owner">{$_('chat_join_link_owner', {values: {name: preview.owner?.displayName || preview.owner?.handle || ''}})}</p>

        {#if preview.requireApproval && !preview.convo}
          <p class="join-page-card__note">{$_('chat_join_link_require_approval_note')}</p>
        {/if}

        <div class="join-page-card__buttons">
          {#if preview.convo}
            <button class="button button--ssl" onclick={() => openConvo(preview.convo)}>{$_('chat_join_link_open')}</button>
          {:else if pending}
            <p class="join-page-card__pending">{$_('chat_join_request_pending')}</p>
            <button class="button button--ssl button--border" onclick={withdraw}>{$_('chat_join_request_withdraw')}</button>
          {:else}
            <button class="button button--ssl" disabled={isJoining} onclick={join}>{$_('chat_join_link_join')}</button>
          {/if}
        </div>
      </div>
    {:else if preview?.$type === JOIN_LINK_PREVIEW_DISABLED_TYPE}
      <p class="join-page__message">{$_('chat_join_link_disabled_note')}</p>
    {:else}
      <p class="join-page__message">{$_('chat_join_link_invalid')}</p>
    {/if}
  </div>
</div>

<style lang="postcss">
  .join-page {
      padding: 32px 16px;
  }

  .join-page__message {
      color: var(--text-color-3);
      text-align: center;
      padding: 24px 0;
  }

  .join-page-card {
      max-width: 400px;
      margin: 0 auto;
      text-align: center;
      border: 1px solid var(--border-color-2);
      border-radius: var(--border-radius-3);
      padding: 24px 16px;

      &__avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          overflow: hidden;
          background-color: var(--primary-color);
          margin: 0 auto 12px;

          img {
              width: 100%;
              height: 100%;
              object-fit: cover;
          }
      }

      &__name {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 4px;
          overflow-wrap: anywhere;
      }

      &__meta {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          color: var(--text-color-3);
          font-size: 13px;
          margin-bottom: 4px;
      }

      &__owner {
          color: var(--text-color-3);
          font-size: 13px;
          margin-bottom: 8px;
      }

      &__note {
          color: var(--text-color-3);
          font-size: 12px;
          margin-bottom: 8px;
      }

      &__pending {
          color: var(--text-color-3);
          font-size: 13px;
      }

      &__buttons {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          margin-top: 16px;
      }
  }
</style>
