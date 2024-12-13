<script lang="ts">
  import { _ } from "svelte-i18n";
  import Menu from "$lib/components/ui/Menu.svelte";
  import { createLongPress } from "svelte-interactions";
  import {keywordMuteState} from "$lib/classes/keywordMuteState.svelte";
  import {toast} from "svelte-sonner";
  import {Copy, WholeWord} from "lucide-svelte";
  const { longPressAction } = createLongPress();

  let { item } = $props();
  let isTagMenuOpen = $state(false);

  function handleTagLongClick() {
      isTagMenuOpen = true;
  }

  function handleTagClick(e) {
      if (isTagMenuOpen) {
          e.preventDefault();
      }
  }

  function muteTag() {
      keywordMuteState.add(item.text);
      toast.success($_('success_mute_tag', {values: {tag: item.text}}));
      localStorage.setItem('keywordMutes', JSON.stringify($state.snapshot(keywordMuteState.keywords)));
      isTagMenuOpen = false;
  }

  function copyTag() {
      navigator.clipboard.writeText(item.text)
          .then(() => {
              toast.success($_('success_copy_tag', {values: {tag: item.text}}));
          }, () => {
              toast.success($_('failed_copy'));
          });

      isTagMenuOpen = false;
  }
</script>

<Menu bind:isMenuOpen={isTagMenuOpen} isLongPress={isTagMenuOpen} buttonClassName="menu-tag-link" position="bottom-start">
  {#snippet ref()}{/snippet}
  {#snippet content()}
    <ul class="timeline-menu-list">
      <li class="timeline-menu-list__item timeline-menu-list__item--delete">
        <button class="timeline-menu-list__button" onclick={muteTag}>
          <WholeWord size="20" color="var(--danger-color)"></WholeWord>
          <span class="text-danger">{$_('tag_instant_mute')}</span>
        </button>
      </li>

      <li class="timeline-menu-list__item">
        <button class="timeline-menu-list__button" onclick={copyTag}>
          <Copy size="20" color="var(--text-color-1)"></Copy>
          <span>{$_('tag_instant_copy')}</span>
        </button>
      </li>
    </ul>
  {/snippet}
</Menu>

<a href="/search?q={encodeURIComponent('#' + item.tag?.tag)}" onclick={handleTagClick} use:longPressAction onlongpress={handleTagLongClick} style="outline: none">{item.text}</a>