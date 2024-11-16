<script lang="ts">
    import {_} from 'svelte-i18n';
    import KeywordMuteItem from "./KeywordMuteItem.svelte";
    import {defaultKeyword} from "$lib/timelineFilter";
    import OfficialMuteList from "./OfficialMuteList.svelte";
    import {keywordMuteState} from "$lib/classes/keywordMuteState.svelte";
    import SettingsHeader from "$lib/components/settings/SettingsHeader.svelte";

    function add() {
        keywordMuteState.keywords.push(defaultKeyword);
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

    $effect(() => {
        localStorage.setItem('keywordMutes', JSON.stringify($state.snapshot(keywordMuteState.keywords)));
    })
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
        <button class="keyword-mute-delete" onclick={() => {keywordDelete(index)}}><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg></button>
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