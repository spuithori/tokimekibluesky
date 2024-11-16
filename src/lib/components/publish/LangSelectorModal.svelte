<script lang="ts">
  import { settings } from '$lib/stores';
  import { _ } from 'svelte-i18n';
  import {languageMap} from "$lib/langs/languageMap";
  import Modal from "$lib/components/ui/Modal.svelte";

  let langSelector = $state($settings.langSelector || []);

  $effect(() => {
      $settings.langSelector = langSelector;
  })
</script>

<Modal title={$_('user_language_settings')} on:close>
  <div class="lang-filter-list">
    <div class="lang-filter-list__item">
      <p class="lang-filter-list__name"><label for="auto">{$_('lang_selector_auto')}</label></p>

      <div class="input-toggle">
        <input class="input-toggle__input" type="radio" id="auto"
               value="auto" name="Languages" bind:group={langSelector}><label class="input-toggle__label" for="auto"></label>
      </div>
    </div>

    {#each languageMap as [k, v]}
      <div class="lang-filter-list__item">
        <p class="lang-filter-list__name"><label for={k}>{$_(v.name)}</label></p>

        <div class="input-toggle">
          <input class="input-toggle__input" type="radio" id={k}
                 value={k} name="Languages" bind:group={langSelector}><label class="input-toggle__label" for={k}></label>
        </div>
      </div>
    {/each}
  </div>
</Modal>