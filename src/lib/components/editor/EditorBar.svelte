<script lang="ts">
import {settings} from "$lib/stores";
import {_} from "svelte-i18n";
import {languageMap} from "$lib/langs/languageMap";
import Menu from "$lib/components/ui/Menu.svelte";
import EmojiPicker from "$lib/components/publish/EmojiPicker.svelte";
import LangSelectorModal from "$lib/components/publish/LangSelectorModal.svelte";
import {createEventDispatcher} from "svelte";
import {isPublishFormExpand, selfLabels} from "$lib/components/editor/publishStore";
const dispatch = createEventDispatcher();

let isLangSelectorOpen = false;
let isEmojiPickerOpen = false;
let isSelfLabelingMenuOpen = false;
const selfLabelsChoices = [
    {
        name: $_('self_labels_spoiler'),
        description: $_('self_labels_description_3'),
        val: 'spoiler',
    },
    {
        name: $_('self_labels_porn'),
        description: $_('self_labels_description_2'),
        val: 'porn',
    },
    {
        name: $_('self_labels_warning'),
        description: $_('self_labels_description_1'),
        val: '!warn',
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
  <slot></slot>

  <!-- <div class="publish-form-expand">
    <button
        class="publish-form-expand-button"
        class:publish-form-expand-button--active={$isPublishFormExpand}
        on:click={() => {$isPublishFormExpand = !$isPublishFormExpand}}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--publish-tool-button-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-maximize-2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" x2="14" y1="3" y2="10"/><line x1="3" x2="10" y1="21" y2="14"/></svg>
    </button>
  </div> -->

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

  <div class="publish-form-lang-selector">
    <button class="publish-form-lang-selector-button" on:click={() => {isLangSelectorOpen = !isLangSelectorOpen}}>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--publish-tool-button-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-globe"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
      {#if ($settings.langSelector !== 'auto')}
        {$_(languageMap.get($settings.langSelector).name)}
      {/if}
    </button>
  </div>
</div>

{#if (isLangSelectorOpen)}
  <LangSelectorModal on:close={() => {isLangSelectorOpen = false}}></LangSelectorModal>
{/if}

<style lang="postcss">
    .publish-form-lang-selector {
        position: relative;
    }

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
        background-color: var(--publish-textarea-bg-color);
        gap: 5px;
        border-radius: 0 0 var(--border-radius-3) var(--border-radius-3);
        position: relative;

        @media (max-width: 767px) {
            position: relative;
        }
    }

    .publish-form-emoji-picker {

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

    .publish-form-expand-button {
        align-items: center;
        justify-content: center;
        gap: 4px;
        color: var(--text-color-1);
        padding: 0 5px;
        font-size: 14px;
        height: 30px;

        @media (max-width: 767px) {
            display: none;
        }

        &--active {
            svg {
                stroke: var(--primary-color)
            }
        }
    }
</style>