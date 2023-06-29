<script lang="ts">
    import {_} from 'svelte-i18n';
    import { settings } from '$lib/stores';
    import { languageMap } from "$lib/langs/languageMap";
    let langFilter = $settings.langFilter || [];

    $: {
        $settings.langFilter = langFilter;
    }
</script>

<svelte:head>
  <title>Language filter - TOKIMEKI Bluesky</title>
</svelte:head>

<div>
  <div class="settings-heading">
    <a href="/settings" class="settings-back"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="16.97" viewBox="0 0 20 16.97">
      <path id="arrow-left" d="M3.828,9,9.9,2.929,8.485,1.515,0,10l.707.707,7.778,7.778L9.9,17.071,3.828,11H20V9Z" transform="translate(0 -1.515)" fill="var(--text-color-1)"/>
    </svg></a>

    <h1 class="settings-title">{$_('settings_lang_filter')} ({langFilter.length})</h1>
  </div>

  <p class="settings-description">{$_('lang_filter_description')}</p>

  <div class="settings-wrap">
    <div class="lang-filter-wrap">
      <div class="lang-filter-list">
        {#each languageMap as [k, v]}
          <div class="lang-filter-list__item">
            <p class="lang-filter-list__name"><label for={k}>{$_(v.name)}</label></p>

            <div class="input-toggle">
              <input class="input-toggle__input" type="checkbox" id={k}
              value={k} name="Languages" bind:group={langFilter}><label class="input-toggle__label" for={k}></label>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>

<style lang="postcss">
  .lang-filter-list {
      display: grid;
      grid-template-columns: repeat(2, 1fr);

      &__item {
          padding: 10px;
          border-bottom: 1px solid var(--border-color-1);
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;

          &:nth-child(2n - 1) {
              border-right: 1px solid var(--border-color-1);
          }
      }

      &__name {
          label {
              cursor: pointer;

              &::before {
                  content: '';
                  display: block;
                  position: absolute;
                  left: 0;
                  top: 0;
                  right: 0;
                  bottom: 0;
              }
          }
      }
  }
</style>