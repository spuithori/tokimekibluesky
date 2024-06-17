<script lang="ts">
import {agent, replyRef, settings, threadGate} from "$lib/stores";
import {_} from "svelte-i18n";
import Menu from "$lib/components/ui/Menu.svelte";
import EmojiPicker from "$lib/components/publish/EmojiPicker.svelte";
import {createEventDispatcher} from "svelte";
import {selfLabels} from "$lib/components/editor/publishStore";
import ThreadGateModal from "$lib/components/publish/ThreadGateModal.svelte";
const dispatch = createEventDispatcher();

export let _agent = $agent;
let isEmojiPickerOpen = false;
let isSelfLabelingMenuOpen = false;
let isThreadGateOpen = false;

const selfLabelsChoices = [
    {
        name: $_('labeling_sexual'),
        val: 'sexual',
    },
    {
        name: $_('labeling_nudity'),
        val: 'nudity',
    },
    {
        name: $_('labeling_porn'),
        val: 'porn',
    },
    {
        name: $_('labeling_gore'),
        val: 'gore',
    },
];

function setSelfLabel(index) {
    $selfLabels = [
        {
            val: selfLabelsChoices[index].val,
        }
    ];
    isSelfLabelingMenuOpen = false;
}

function clearSelfLabels() {
    selfLabels.set([]);
    isSelfLabelingMenuOpen = false;
}

function handleEmojiPick(event) {
    const emoji = event.detail.emoji.native;
    dispatch('emojiPicked', {
        emoji,
    })
}
</script>

<div class="publish-bottom-buttons">
  <slot name="top"></slot>

  <div class="publish-form-emoji-picker">
    <button class="publish-form-emoji-picker-button" on:click={() => {isEmojiPickerOpen = !isEmojiPickerOpen}}>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--publish-tool-button-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-laugh"><circle cx="12" cy="12" r="10"/><path d="M18 13a6 6 0 0 1-6 5 6 6 0 0 1-6-5h12Z"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>
    </button>

    {#if (isEmojiPickerOpen)}
      <EmojiPicker on:pick={handleEmojiPick} on:outside={() => {isEmojiPickerOpen = !isEmojiPickerOpen}}></EmojiPicker>
    {/if}
  </div>

  <div class="publish-form-moderation">
    <Menu bind:isMenuOpen={isSelfLabelingMenuOpen} buttonClassName="publish-form-moderation-button">
      <svg class:stroke-danger={$selfLabels.length} slot="ref" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--publish-tool-button-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>

      <ul slot="content" class="timeline-menu-list">
        {#each selfLabelsChoices as choice, index}
          <li class="timeline-menu-list__item">
            <button class="timeline-menu-list__button" class:timeline-menu-list__button--active={$selfLabels.some(label => label.val === choice.val)} on:click={() => setSelfLabel(index)}>{choice.name}</button>
          </li>
        {/each}

        {#if ($selfLabels.length)}
          <li class="timeline-menu-list__item">
            <button class="timeline-menu-list__button text-danger" on:click={clearSelfLabels}>{$_('selflabels_remove')}</button>
          </li>
        {/if}
      </ul>
    </Menu>
  </div>

  {#if (!$replyRef)}
    <div class="publish-form-thread-gate">
      <button class="publish-form-lang-selector-button" on:click={() => {isThreadGateOpen = !isThreadGateOpen}}>
        <svg class:stroke-danger={$threadGate !== 'everybody'} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--publish-tool-button-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-square-warning"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M12 7v2"/><path d="M12 13h.01"/></svg>
      </button>
    </div>
  {/if}

  <slot name="bottom"></slot>
</div>

{#if (isThreadGateOpen)}
  <ThreadGateModal on:close={() => {isThreadGateOpen = false}} {_agent}></ThreadGateModal>
{/if}

<style lang="postcss">
    .publish-form-lang-selector-button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        color: var(--text-color-1);
        padding: 0 5px;
        font-size: 14px;
        height: 30px;
    }

    .publish-form-moderation {
        position: relative;
    }

    .publish-bottom-buttons {
        display: flex;
        justify-content: flex-end;
        padding: 10px 15px;
        z-index: 21;
        gap: 5px;
        border-radius: 0 0 var(--border-radius-3) var(--border-radius-3);
        position: sticky;
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