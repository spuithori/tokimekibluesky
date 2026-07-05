<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import {formatDate} from "$lib/dateFormat";
    import {agent} from "$lib/stores";

    let { message, _agent } = $props();
    const currentAgent = $derived(_agent || $agent);
</script>

<div class="chat-item-deleted-wrap">
  <div class="chat-item-deleted" class:chat-item-deleted--me={message.sender?.did === currentAgent?.did?.()}>
    <p class="chat-item-deleted__text">
      {$_('chat_message_deleted')}

      <time class="chat-item-deleted__time" datetime={formatDate(new Date(message.sentAt), 'yyyy-MM-dd\'T\'HH:mm:ss')}>{formatDate(new Date(message.sentAt), 'MM/dd HH:mm')}</time>
    </p>
  </div>
</div>

<style lang="postcss">
  .chat-item-deleted-wrap {
      display: flex;
  }

  .chat-item-deleted {
      margin-bottom: 8px;

      &--me {
          margin-left: auto;
      }

      &__text {
          width: fit-content;
          border: 1px dashed var(--border-color-1);
          color: var(--text-color-3);
          font-style: italic;
          padding: 8px 16px;
          border-radius: 16px;
          font-size: var(--timeline-content-font-size);
          line-height: 1.5;
      }

      &__time {
          font-size: 11px;
          font-style: normal;
          padding-bottom: 4px;
      }
  }
</style>
