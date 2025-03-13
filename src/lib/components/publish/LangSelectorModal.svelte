<script lang="ts">
  import { _ } from 'svelte-i18n';
  import {languageMap} from "$lib/langs/languageMap";
  import Modal from "$lib/components/ui/Modal.svelte";
  import {getPostState} from "$lib/classes/postState.svelte";
  import {watch} from "runed";

  let { onclose, post } = $props();
  const postState = getPostState();
  let disabled = $derived(post.lang.length >= 3);

  watch(() => post.lang, () => {
    postState.langs.current = post.lang;
  });

  $effect(() => {
      if (Array.isArray(post.lang) && post.lang.includes('auto')) {
          post.lang = post.lang.filter(lang => lang !== 'auto');
      }
  });
</script>

<Modal title={$_('user_language_settings')} {onclose}>
  <div class="lang-filter-list">
    <div class="lang-filter-list__item lang-filter-list__item--fullwidth">
      <p class="lang-filter-list__name"><label for="auto">{$_('lang_selector_auto')}</label></p>

      <div class="input-toggle">
        <input class="input-toggle__input" type="radio" id="auto"
               value="auto" name="Languages" bind:group={post.lang}><label class="input-toggle__label" for="auto"></label>
      </div>
    </div>

    {#each languageMap as [k, v]}
      <div class="lang-filter-list__item">
        <p class="lang-filter-list__name"><label for={k}>{$_(v.name)}</label></p>

        <div class="input-toggle">
          <input class="input-toggle__input" type="checkbox" id={k}
                 value={k} name="Languages" bind:group={post.lang} disabled={disabled && !post.lang.includes(k) && post.lang !== 'auto'}><label class="input-toggle__label" for={k}></label>
        </div>
      </div>
    {/each}
  </div>
</Modal>