<script lang="ts">
  import ChatTiptap from "$lib/components/chat/ChatTiptap.svelte";
  import {RichText} from "@atproto/api";
  import {detectRichTextWithEditorJson} from "$lib/components/editor/richtext";
  import {agent, settings} from "$lib/stores";
  import {CHAT_PROXY} from "$lib/components/chat/chatConst";

  let { id, column = $bindable(), _agent = $agent, onrefresh } = $props();
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

          console.log(rt)

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

          column.data.feed = [...column.data.feed, create.data];

          setTimeout(() => {
              const scrollEl = $settings.design?.layout === 'decks' ? column.scrollElement || document.querySelector(':root') : document.querySelector(':root');
              scrollEl.scrollTo({
                  top: scrollEl.scrollHeight,
                  behavior: 'smooth',
              });
          }, 1000)

          console.log(column.data.feed);

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