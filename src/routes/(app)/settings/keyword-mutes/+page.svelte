<script lang="ts">
    import {_} from 'svelte-i18n';
    import {keywordMutes} from '$lib/stores';
    import KeywordMuteItem from "./KeywordMuteItem.svelte";
    import {defaultKeyword} from "$lib/timelineFilter";
    import OfficialMuteList from "./OfficialMuteList.svelte";

    let keywords = $keywordMutes;

    function add() {
        keywords = [...keywords, structuredClone(defaultKeyword)];
    }

    function keywordDelete(index) {
        keywords.splice(index, 1);
        keywords = keywords;
    }

    function handleImport(event) {
        const alreadyWords = keywords.map(keyword => {
            return keyword.word;
        })

        if (!alreadyWords.includes(event.detail.word.word)) {
            keywords = [...keywords, event.detail.word];
        }
    }

    $: {
        $keywordMutes = keywords;
        localStorage.setItem('keywordMutes', JSON.stringify($keywordMutes));
    }
</script>

<svelte:head>
  <title>{$_('settings_keyword_mutes')} - TOKIMEKI</title>
</svelte:head>

<div>
  <div class="column-heading">
    <div class="column-heading__buttons">
      <button class="settings-back" onclick={() => {history.back()}}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
      </button>
    </div>

    <h1 class="column-heading__title">{$_('settings_keyword_mutes')}</h1>

    <div class="column-heading__buttons column-heading__buttons--right">
      <a class="settings-back" href="/">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </a>
    </div>
  </div>

  <div class="settings-wrap">
    <p class="settings-description">{$_('keyword_mute_description')}</p>

    <div class="keyword-mutes-add">
      <button class="button" onclick={add}>{$_('add_keyword')}</button>
    </div>

    {#each keywords as keyword, index}
      <div class="keyword-mute-wrap">
        <KeywordMuteItem keyword={keyword} index={index}></KeywordMuteItem>
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