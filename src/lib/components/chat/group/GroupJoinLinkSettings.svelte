<script lang="ts">
    import { _ } from 'svelte-i18n';
    import {toast} from "svelte-sonner";
    import {CHAT_PROXY} from "$lib/components/chat/chatConst";
    import {chatErrorKey} from "$lib/components/chat/chatErrors";
    import {Copy, Share2} from "lucide-svelte";

    let { convo, _agent, onconvoupdate = undefined } = $props();
    let joinRule = $state(convo?.kind?.joinLink?.joinRule ?? 'anyone');
    let requireApproval = $state(convo?.kind?.joinLink?.requireApproval ?? false);
    let isBusy = $state(false);

    const joinLink = $derived(convo?.kind?.joinLink);
    const isEnabled = $derived(joinLink?.enabledStatus === 'enabled');
    const joinLinkUrl = $derived(joinLink ? `https://bsky.app/chat/${joinLink.code}` : '');
    const isRuleChanged = $derived(!!joinLink && (joinRule !== joinLink.joinRule || requireApproval !== joinLink.requireApproval));

    function patchJoinLink(newJoinLink) {
        onconvoupdate?.({...convo, kind: {...convo.kind, joinLink: newJoinLink}});
    }

    async function callJoinLinkApi(nsid: string, body: Record<string, any>, successKey: string) {
        isBusy = true;

        try {
            const res = await _agent.xrpc.post(nsid, body, {
                headers: {
                    'atproto-proxy': CHAT_PROXY,
                }
            });
            patchJoinLink(res.joinLink);
            toast.success($_(successKey));
        } catch (e) {
            console.error(e);
            toast.error($_(chatErrorKey(e)));
        } finally {
            isBusy = false;
        }
    }

    function createJoinLink() {
        return callJoinLinkApi('chat.bsky.group.createJoinLink', {convoId: convo.id, joinRule: joinRule, requireApproval: requireApproval}, 'chat_join_link_created');
    }

    function saveJoinLink() {
        return callJoinLinkApi('chat.bsky.group.editJoinLink', {convoId: convo.id, joinRule: joinRule, requireApproval: requireApproval}, 'chat_join_link_saved');
    }

    function enableJoinLink() {
        return callJoinLinkApi('chat.bsky.group.enableJoinLink', {convoId: convo.id}, 'chat_join_link_enabled');
    }

    function disableJoinLink() {
        return callJoinLinkApi('chat.bsky.group.disableJoinLink', {convoId: convo.id}, 'chat_join_link_disabled');
    }

    async function copyJoinLink() {
        try {
            await navigator.clipboard.writeText(joinLinkUrl);
            toast.success($_('success_copy_url'));
        } catch (e) {
            console.error(e);
        }
    }

    async function shareJoinLink() {
        try {
            await navigator.share({url: joinLinkUrl});
        } catch (e) {
            console.error(e);
        }
    }
</script>

<div class="join-link-settings">
  {#if joinLink}
    {#if isEnabled}
      <div class="join-link-url">
        <p class="join-link-url__text">{joinLinkUrl}</p>

        <div class="join-link-url__buttons">
          <button class="join-link-url__button" onclick={copyJoinLink} aria-label={$_('chat_join_link_copy')}>
            <Copy size="18" color="var(--text-color-1)"></Copy>
          </button>

          {#if typeof navigator !== 'undefined' && 'share' in navigator}
            <button class="join-link-url__button" onclick={shareJoinLink} aria-label="Share">
              <Share2 size="18" color="var(--text-color-1)"></Share2>
            </button>
          {/if}
        </div>
      </div>
    {:else}
      <p class="join-link-disabled-note">{$_('chat_join_link_disabled_note')}</p>
    {/if}
  {:else}
    <p class="join-link-intro">{$_('chat_join_link_intro')}</p>
  {/if}

  {#if !joinLink || isEnabled}
    <div class="join-link-rules">
      <div class="radio-group">
        <label class="join-link-rule">
          <input type="radio" bind:group={joinRule} value="anyone">
          <span>{$_('chat_join_link_rule_anyone')}</span>
        </label>

        <label class="join-link-rule">
          <input type="radio" bind:group={joinRule} value="followedByOwner">
          <span>{$_('chat_join_link_rule_followed')}</span>
        </label>
      </div>

      <label class="join-link-rule">
        <input type="checkbox" bind:checked={requireApproval}>
        <span>{$_('chat_join_link_require_approval')}</span>
      </label>
    </div>
  {/if}

  <div class="join-link-actions">
    {#if !joinLink}
      <button class="button button--ssl" disabled={isBusy} onclick={createJoinLink}>{$_('chat_join_link_create')}</button>
    {:else if isEnabled}
      {#if isRuleChanged}
        <button class="button button--ssl" disabled={isBusy} onclick={saveJoinLink}>{$_('chat_join_link_save')}</button>
      {/if}

      <button class="button button--ssl button--border" disabled={isBusy} onclick={disableJoinLink}>{$_('chat_join_link_disable')}</button>
    {:else}
      <button class="button button--ssl" disabled={isBusy} onclick={enableJoinLink}>{$_('chat_join_link_enable')}</button>
    {/if}
  </div>
</div>

<style lang="postcss">
  .join-link-url {
      display: flex;
      align-items: center;
      gap: 8px;
      background-color: var(--bg-color-2);
      border: 1px solid var(--border-color-2);
      border-radius: var(--border-radius-2);
      padding: 8px 12px;
      margin-bottom: 16px;

      &__text {
          flex: 1;
          min-width: 0;
          font-size: 13px;
          overflow-wrap: anywhere;
      }

      &__buttons {
          display: flex;
          gap: 4px;
          flex-shrink: 0;
      }

      &__button {
          width: 32px;
          height: 32px;
          display: grid;
          place-content: center;
          border-radius: var(--border-radius-2);

          &:hover {
              background-color: var(--bg-color-1);
          }
      }
  }

  .join-link-intro,
  .join-link-disabled-note {
      color: var(--text-color-3);
      font-size: 13px;
      line-height: 1.5;
      margin-bottom: 16px;
  }

  .join-link-rules {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
  }

  .radio-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
  }

  .join-link-rule {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      cursor: pointer;
  }

  .join-link-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: center;
  }
</style>
