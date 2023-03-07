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
          timeline.set(await $agent.getTimeline(agent));
      }
  })
</script>

<div class="reply">
  <div class="publish-form">
    <textarea type="text" class="publish-form__input" disabled={isTextareaEnabled} bind:value={publishContent} on:keydown={publishKeypress} placeholder="Alt + Enter"></textarea>
  </div>
</div>

<style>
  .reply {
      margin-top: 10px;
  }
</style>