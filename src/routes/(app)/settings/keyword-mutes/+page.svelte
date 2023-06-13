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
  <title>Keyword Mutes - TOKIMEKI Bluesky</title>
</svelte:head>

<div>
  <div class="settings-heading">
    <a href="/settings" class="settings-back"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="16.97" viewBox="0 0 20 16.97">
      <path id="arrow-left" d="M3.828,9,9.9,2.929,8.485,1.515,0,10l.707.707,7.778,7.778L9.9,17.071,3.828,11H20V9Z" transform="translate(0 -1.515)" fill="var(--text-color-1)"/>
    </svg></a>

    <h1 class="settings-title">{$_('settings_keyword_mutes')}</h1>
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