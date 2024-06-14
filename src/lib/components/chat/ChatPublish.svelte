<script lang="ts">
  import ChatTiptap from "$lib/components/chat/ChatTiptap.svelte";
  import {RichText} from "@atproto/api";
  import {detectRichTextWithEditorJson} from "$lib/components/editor/richtext";
  import {agent, settings} from "$lib/stores";
  import {createEventDispatcher} from "svelte";
  import {CHAT_PROXY} from "$lib/components/chat/chatConst";
  const dispatch = createEventDispatcher();

  export let id;
  export let column;
  export let _agent = $agent;
  let text = '';
  let json;
  let editor;

  $: publishContentLength = new RichText({text: text}).graphemeLength;
  $: isPublishEnabled = publishContentLength > 300;

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
          dispatch('refresh');
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
      bottom: 0;
      margin-inline: -16px;
      padding: 8px 16px;
      background-color: var(--timeline-bg-color);
      z-index: 11;
  }
</style>