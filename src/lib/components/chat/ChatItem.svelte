<script lang="ts">
  import {agent} from "$lib/stores";
  import TimelineText from "$lib/components/post/TimelineText.svelte";
  import {format, parseISO} from "date-fns";
  import {isEmojiSequenceOrCombination} from "$lib/util";
  import EmbedRecord from "$lib/components/post/EmbedRecord.svelte";
  import EmbedStamp from "$lib/components/post/EmbedStamp.svelte";
  import {AppBskyEmbedRecord} from "@atproto/api";

  export let message;
  export let _agent = $agent;
</script>

{#if message.text}
  <div class="chat-item" class:chat-item--me={message.sender.did === _agent.did()}>
    <p class="chat-item__text">
      {#if isEmojiSequenceOrCombination(message.text)}
        <span class="chat-text-emoji">{message.text}</span>
      {:else}
        <TimelineText record={message} _agent={_agent}></TimelineText>
      {/if}
    </p>

    <time class="chat-item__time" datetime="{format(parseISO(message.sentAt), 'yyyy-MM-dd\'T\'HH:mm:ss')}">{format(parseISO(message.sentAt), 'MM/dd HH:mm')}</time>
  </div>
{/if}

{#if message.embed}
  <div class="chat-record">
    {#if message.embed.record?.isStamp}
      <EmbedStamp record={message.embed.record} {_agent}></EmbedStamp>
    {:else}
      {#if (AppBskyEmbedRecord.isView(message.embed) && AppBskyEmbedRecord.isViewRecord(message.embed?.record)) }
        <EmbedRecord record={message.embed.record} {_agent}></EmbedRecord>
      {/if}
    {/if}
  </div>
{/if}

<style lang="postcss">
  .chat-item {
      display: flex;
      align-items: flex-end;
      gap: 8px;

      &--me {
          margin-left: auto;
          flex-direction: row-reverse;

          .chat-item__text {
              color: var(--bg-color-1);
              background-color: var(--primary-color);
              border-radius: 16px 0 16px 16px;
          }
      }

      &__text {
          background-color: var(--border-color-2);
          padding: 8px 16px;
          margin-bottom: 8px;
          width: max-content;
          border-radius: 0 16px 16px 16px;
          white-space: pre-line;
          font-size: var(--timeline-content-font-size);
          line-height: 1.5;
      }

      &__time {
          font-size: 12px;
          color: var(--text-color-3);
          padding-bottom: 12px;
      }
  }

  .chat-text-emoji {
      font-size: calc(var(--timeline-content-font-size) * 2);
  }

  .chat-record {
      margin-bottom: 16px;
  }
</style>