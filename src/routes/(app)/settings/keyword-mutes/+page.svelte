<script lang="ts">
    import Trash2 from '@lucide/svelte/icons/trash-2';
    import {_} from 'svelte-i18n';
    import KeywordMuteItem from "./KeywordMuteItem.svelte";
    import OfficialMuteList from "./OfficialMuteList.svelte";
    import {keywordMuteState} from "$lib/classes/keywordMuteState.svelte";
    import SettingsHeader from "$lib/components/settings/SettingsHeader.svelte";

    function add() {
        keywordMuteState.add('');
    }

    function keywordDelete(index) {
        keywordMuteState.keywords.splice(index, 1);
    }

    function handleImport(event) {
        const alreadyWords = keywordMuteState.keywords.map(keyword => {
            return keyword.word;
        })

        if (!alreadyWords.includes(event.detail.word.word)) {
            keywordMuteState.keywords.push(event.detail.word);
        }
    }
</script>

<svelte:head>
  <title>{$_('settings_keyword_mutes')} - TOKIMEKI</title>
</svelte:head>

<div>
  <SettingsHeader>
    {$_('settings_keyword_mutes')}
  </SettingsHeader>

  <div class="settings-wrap">
    <p class="settings-description">{$_('keyword_mute_description')}</p>

    <div class="keyword-mutes-add">
      <button class="button" onclick={add}>{$_('add_keyword')}</button>
    </div>

    {#each keywordMuteState.keywords as keyword, index}
      <div class="keyword-mute-wrap">
        <KeywordMuteItem bind:keyword={keywordMuteState.keywords[index]} index={index}></KeywordMuteItem>
        <button class="keyword-mute-delete" onclick={() => {keywordDelete(index)}}><Trash2 size={20} color="var(--danger-color)" /></button>
      </div>

    {:else}
      <p class="nothing">{$_('mute_keywords_nothing')}</p>
    {/each}

    <div class="mute-words-import">
      <h2>{$_('mute_keywords_import')}</h2>
      <p class="settings-description">{$_('mute_keywords_import_description')}</p>

      <OfficialMuteList on:add={handleImport}></OfficialMuteList>
    </div>
  </div>
</div>

<style lang="postcss">
  .nothing {
      margin-top: 10px;
  }

  .keyword-mute-wrap {
      position: relative;
  }

  .keyword-mute-delete {
      position: absolute;
      top: 15px;
      right: 15px;
  }

  .mute-words-import {
      margin-top: 24px;

      h2 {
          font-size: 16px;
          color: var(--text-color-1);
          margin-bottom: 8px;
      }
  }
</style>