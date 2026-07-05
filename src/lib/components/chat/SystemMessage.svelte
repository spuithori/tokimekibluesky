<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import {formatDate} from "$lib/dateFormat";
    import {getSystemMessageContent} from "$lib/components/chat/systemMessageText";

    let { message, convo, members = {} } = $props();

    function resolveName(did) {
        if (!did) return '';
        const member = members[did] ?? convo?.members?.find(m => m.did === did);
        return member?.displayName || member?.handle || $_('chat_unknown_user');
    }

    const content = $derived(getSystemMessageContent(message.data, resolveName));
</script>

<div class="chat-system-message">
  <span class="chat-system-message__text">{$_(content.key, content.values)}</span>
  <time class="chat-system-message__time" datetime={formatDate(new Date(message.sentAt), 'yyyy-MM-dd\'T\'HH:mm:ss')}>{formatDate(new Date(message.sentAt), 'MM/dd HH:mm')}</time>
</div>

<style lang="postcss">
  .chat-system-message {
      text-align: center;
      margin-bottom: 8px;
      color: var(--text-color-3);
      font-size: 12px;
      line-height: 1.4;

      &__time {
          margin-left: 6px;
      }
  }
</style>
