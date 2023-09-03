<script lang="ts">
    import {_} from 'svelte-i18n';
    import { settings } from '$lib/stores';
    import KeywordMuteItem from "./KeywordMuteItem.svelte";
    let keywordMutes = $settings.keywordMutes || [];

    function add() {
        keywordMutes = [...keywordMutes, {
            word: '',
            period: {
                start: '00:00',
                end: '23:59',
            }
        }];
    }

    function keywordDelete(index) {
        keywordMutes.splice(index, 1);
        keywordMutes = keywordMutes;
    }

    $: {
        $settings.keywordMutes = keywordMutes;
    }
</script>

<svelte:head>
  <title>{$_('settings_keyword_mutes')} - TOKIMEKI</title>
</svelte:head>

<div>
  <div class="column-heading">
    <div class="column-heading__buttons">
      <button class="settings-back" on:click={() => {history.back()}}>
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
    <div class="keyword-mutes-add">
      <button class="button" on:click={add}>{$_('add_keyword')}</button>
    </div>

    {#each keywordMutes as keyword, index}
      <div class="keyword-mute-wrap">
        <KeywordMuteItem keyword={keyword} index={index}></KeywordMuteItem>
        <button class="keyword-mute-delete" on:click={() => {keywordDelete(index)}}><svg xmlns="http://www.w3.org/2000/svg" width="15.2" height="19" viewBox="0 0 15.2 19">
          <path id="trash" d="M67.8,1.9,69.7,0h3.8l1.9,1.9h3.8V3.8H64V1.9ZM64.95,5.7h13.3L77.3,19H65.9ZM69.7,7.6v9.5h.95V7.6Zm2.85,0v9.5h.95V7.6Z" transform="translate(-64)" fill="#d81c2f"/>
        </svg></button>
      </div>

    {:else}
      <p class="nothing">{$_('mute_keywords_nothing')}</p>
    {/each}
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
</style>