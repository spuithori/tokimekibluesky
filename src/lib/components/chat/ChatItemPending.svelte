<script lang="ts">
    import { _ } from 'svelte-i18n';
    import RotateCw from '@lucide/svelte/icons/rotate-cw';
    import X from '@lucide/svelte/icons/x';
    import ChatReplyQuote from "$lib/components/chat/ChatReplyQuote.svelte";

    let { pending, onretry, ondiscard, convo = undefined, members = {}, onjump = undefined } = $props();
</script>

<div class="chat-item-pending-wrap">
  <div class="chat-item-pending" class:chat-item-pending--failed={pending.status === 'failed'}>
    {#if pending.replyTo}
      <ChatReplyQuote replyTo={pending.replyTo} {convo} {members} mine={true} onjump={pending.replyTo.id ? () => onjump?.(pending.replyTo.id) : undefined}></ChatReplyQuote>
    {/if}

    <p class="chat-item-pending__text">{pending.record.text}</p>

    {#if pending.status === 'failed'}
      <div class="chat-item-pending__actions">
        <span class="chat-item-pending__label">{$_('chat_send_failed')}</span>

        <button class="chat-item-pending__button" onclick={() => onretry(pending.localId)} aria-label={$_('chat_retry')}>
          <RotateCw size="14" color="var(--danger-color)"></RotateCw>
          {$_('chat_retry')}
        </button>

        <button class="chat-item-pending__button" onclick={() => ondiscard(pending.localId)} aria-label={$_('chat_discard')}>
          <X size="14" color="var(--text-color-3)"></X>
          {$_('chat_discard')}
        </button>
      </div>
    {/if}
  </div>
</div>

<style lang="postcss">
  .chat-item-pending-wrap {
      display: flex;
  }

  .chat-item-pending {
      margin-bottom: 8px;
      margin-left: auto;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      max-width: calc(100% - 88px);

      &__text {
          width: fit-content;
          color: var(--bg-color-1);
          background-color: var(--primary-color);
          opacity: .6;
          padding: 8px 16px;
          border-radius: 16px;
          white-space: pre-line;
          font-size: var(--timeline-content-font-size);
          line-height: 1.5;
          overflow-wrap: anywhere;
      }

      &--failed {
          .chat-item-pending__text {
              opacity: 1;
              background-color: var(--bg-color-1);
              color: var(--text-color-1);
              border: 1px solid var(--danger-color);
          }
      }

      &__actions {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
          font-size: 12px;
      }

      &__label {
          color: var(--danger-color);
      }

      &__button {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          color: var(--text-color-2);
          font-size: 12px;

          &:hover {
              text-decoration: underline;
          }
      }
  }
</style>
