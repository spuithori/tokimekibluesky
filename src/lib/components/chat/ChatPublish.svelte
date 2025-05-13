<script lang="ts">
  import ChatTiptap from "$lib/components/chat/ChatTiptap.svelte";
  import {RichText} from "@atproto/api";
  import {detectRichTextWithEditorJson} from "$lib/components/editor/richtext";
  import {CHAT_PROXY} from "$lib/components/chat/chatConst";
  import type {Agent} from "$lib/agent";

  let { id, column, _agent, onrefresh }: { _agent: Agent } = $props();
  let text = $state('');
  let json = $state();
  let editor = $state();

  let publishContentLength = $derived(new RichText({text: text}).graphemeLength);
  let isPublishEnabled = $derived(publishContentLength > 300);

  async function publish() {
      try {
          if (!text) {
              return false;
          }

          let rt: RichText | undefined;

          if (text) {
              rt = await detectRichTextWithEditorJson(_agent, text, json);
          }

          const create = await _agent.agent.api.chat.bsky.convo.sendMessage({
              convoId: id,
              message: {
                  facets: rt ? rt.facets : undefined,
                  text: rt ? rt.text : '',
              },
          }, {
              headers: {
                  'atproto-proxy': CHAT_PROXY,
              }
          });

          text = '';
          json = undefined;
          editor.clear();
          onrefresh();
      } catch (e) {
          console.error(e);
      }
  }

  function focus() {

  }
</script>

<div class="chat-publish">
  <ChatTiptap
      bind:text={text}
      bind:json={json}
      bind:this={editor}
      on:publish={publish}
      on:focus={focus}
      {_agent}
      {isPublishEnabled}
  ></ChatTiptap>
</div>

<style lang="postcss">
  .chat-publish {
      position: sticky;
      bottom: calc(env(keyboard-inset-height, 0px) + var(--safe-area-bottom));
      margin-inline: -16px;
      padding: 8px 16px;
      background-color: var(--timeline-bg-color);
      z-index: 11;
  }
</style>