<script>
  import {onMount} from 'svelte';
  import { agent } from '$lib/stores';
  import { timeline } from "$lib/stores";

  export let replyRef;
  export let post;

  let publishContent = '';
  let isTextareaEnabled = '';
  const publishKeypress = e => {
      if (e.keyCode === 13 && e.altKey) publish();
  };
  let publish = function () {};

  onMount(async () => {
      publish = async function () {
          isTextareaEnabled = true;

          if (!publishContent) {
              isTextareaEnabled = false;
              return false;
          }

          await $agent.agent.api.app.bsky.feed.post.create(
              { did: $agent.did() },
              { text: publishContent, createdAt: new Date().toISOString(), reply: { parent: post, root: (replyRef ? replyRef.root : post) } },
          );

          isTextareaEnabled = false;
          publishContent = '';
          const data = await $agent.getTimeline();
          timeline.set(data.feed);
      }
  })
</script>

<div class="reply">
  <div class="publish-form">
    <textarea type="text" class="publish-form__input" disabled={isTextareaEnabled} bind:value={publishContent} on:keydown={publishKeypress} placeholder="Alt + Enter"></textarea>
    <button class="publish-form__submit" on:click={publish}><svg xmlns="http://www.w3.org/2000/svg" width="17" height="12.75" viewBox="0 0 17 12.75">
      <path id="send" d="M0,0,17,6.375,0,12.75ZM0,5.1V7.65L8.5,6.375Z" fill="var(--bg-color-1)"/>
    </svg>
      送信</button>
  </div>
</div>

<style lang="postcss">
  .reply {
      margin-top: 10px;
  }

  .publish-form__input {
      padding-right: 100px;
  }

  .publish-form__submit {
      position: absolute;
      top: 10px;
      right: 10px;
  }
</style>