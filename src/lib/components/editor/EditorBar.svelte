<script lang="ts">
  import {agent} from "$lib/stores";
  import EmojiPicker from "$lib/components/publish/EmojiPicker.svelte";
  import {createEventDispatcher} from "svelte";
  const dispatch = createEventDispatcher();

  let { _agent = $agent, top, bottom } = $props();
  let isEmojiPickerOpen = $state(false);

  function handleEmojiPick(event) {
      const emoji = event.detail.emoji.native;
      dispatch('emojiPicked', {
          emoji,
      })
  }
</script>

<div class="publish-bottom-buttons">
  {@render top?.()}

  <div class="publish-form-emoji-picker">
    <button class="publish-form-emoji-picker-button" onclick={() => {isEmojiPickerOpen = !isEmojiPickerOpen}}>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--publish-tool-button-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-laugh"><circle cx="12" cy="12" r="10"/><path d="M18 13a6 6 0 0 1-6 5 6 6 0 0 1-6-5h12Z"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>
    </button>

    {#if (isEmojiPickerOpen)}
      <EmojiPicker on:pick={handleEmojiPick} on:outside={() => {isEmojiPickerOpen = !isEmojiPickerOpen}}></EmojiPicker>
    {/if}
  </div>

  {@render bottom?.()}
</div>

<style lang="postcss">
    .publish-bottom-buttons {
        display: flex;
        justify-content: flex-end;
        padding: 10px 16px;
        z-index: 21;
        gap: 5px;
        border-radius: 0 0 var(--border-radius-3) var(--border-radius-3);
        bottom: 0;
        background: linear-gradient(to top, var(--publish-textarea-bg-color) 0%, var(--publish-textarea-bg-color) 80%, transparent);

        @media (max-width: 767px) {
            background: var(--publish-textarea-bg-color);
            bottom: env(keyboard-inset-height, 0px);
            left: 0;
            right: 0;
            justify-content: flex-start;
            padding: 8px 12px;
        }
    }

    .publish-form-emoji-picker-button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        color: var(--text-color-1);
        padding: 0 5px;
        font-size: 14px;
        height: 30px;
    }
</style>