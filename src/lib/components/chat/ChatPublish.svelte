<script lang="ts">
  import { _ } from 'svelte-i18n';
  import ChatTiptap from "$lib/components/chat/ChatTiptap.svelte";
  import {RichText} from "$lib/atproto-richtext";
  import {detectRichTextWithEditorJson} from "$lib/components/editor/richtext";
  import {MESSAGE_COUNTER_THRESHOLD, MESSAGE_MAX_GRAPHEMES} from "$lib/components/chat/chatConst";
  import {isConvoLocked} from "$lib/components/chat/convoUtil";
  import Notice from "$lib/components/ui/Notice.svelte";
  import type {Agent} from "$lib/agent";
  import {agent} from "$lib/stores";

  let { id, _agent, convo = undefined, onsend, isSending = false }: { id: string, _agent: Agent, convo?: any, onsend: (record: any) => void, isSending?: boolean } = $props();
  const currentAgent = $derived(_agent || $agent);
  const isLocked = $derived(isConvoLocked(convo));
  let text = $state('');
  let json = $state();
  let editor = $state();
  let isResolving = $state(false);

  const publishContentLength = $derived(new RichText({text: text}).graphemeLength);
  const isOverLimit = $derived(publishContentLength > MESSAGE_MAX_GRAPHEMES);
  const showCounter = $derived(publishContentLength > MESSAGE_COUNTER_THRESHOLD);
  const cannotSend = $derived(!text.trim() || isOverLimit || isResolving);

  async function publish() {
      if (cannotSend) {
          return;
      }

      isResolving = true;

      try {
          const rt = await detectRichTextWithEditorJson(currentAgent, text, json);
          const joinLinkMatch = rt.text.match(/https?:\/\/bsky\.app\/chat\/([A-Za-z0-9_-]+)/);

          const record = {
              text: rt.text,
              facets: rt.facets,
              embed: joinLinkMatch ? {
                  $type: 'chat.bsky.embed.joinLink',
                  code: joinLinkMatch[1],
              } : undefined,
          };

          text = '';
          json = undefined;
          editor.clear();
          onsend(record);
      } catch (e) {
          console.error(e);
      } finally {
          isResolving = false;
      }
  }
</script>

<div class="chat-publish">
  {#if isLocked}
    <Notice text={$_('chat_locked_notice')}></Notice>
  {:else}
    {#if showCounter}
      <p class="chat-publish__counter" class:chat-publish__counter--over={isOverLimit}>{MESSAGE_MAX_GRAPHEMES - publishContentLength}</p>
    {/if}

    <ChatTiptap
        bind:text={text}
        bind:json={json}
        bind:this={editor}
        on:publish={publish}
        _agent={currentAgent}
        disabled={cannotSend}
        {isSending}
    ></ChatTiptap>
  {/if}
</div>

<style lang="postcss">
  .chat-publish {
      padding: 8px 16px;
      background-color: var(--timeline-bg-color);

      &__counter {
          text-align: right;
          font-size: 12px;
          color: var(--text-color-3);
          padding-bottom: 4px;

          &--over {
              color: var(--danger-color);
              font-weight: bold;
          }
      }
  }
</style>
