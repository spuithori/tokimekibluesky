<script lang="ts">
  import { _ } from "svelte-i18n";
  import Menu from "$lib/components/ui/Menu.svelte";
  import { createLongPress } from "$lib/longpress";
  import {keywordMuteState} from "$lib/classes/keywordMuteState.svelte";
  import {toast} from "svelte-sonner";
  import {Copy, Pencil, UserRoundSearch, WholeWord} from "lucide-svelte";
  import {getPostState} from "$lib/classes/postState.svelte";

  let { item, handle = undefined } = $props();
  let isTagMenuOpen = $state(false);
  const postState = getPostState();

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

  function postTag() {
      postState.replaceText(`<span class="editor-hashtag">${item.text}</span>`);
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

      {#if (handle)}
        <li class="timeline-menu-list__item">
          <a class="timeline-menu-list__button" href="/search?q={encodeURIComponent(`${item.text} from:${handle}`)}">
            <UserRoundSearch size="20" color="var(--text-color-1)"></UserRoundSearch>
            <span>{$_('tag_instant_user_search')}</span>
          </a>
        </li>
      {/if}

      <li class="timeline-menu-list__item">
        <button class="timeline-menu-list__button" onclick={postTag}>
          <Pencil size="20" color="var(--text-color-1)"></Pencil>
          <span>{$_('tag_instant_post')}</span>
        </button>
      </li>
    </ul>
  {/snippet}
</Menu>

<a href="/search?q={encodeURIComponent('#' + item.tag?.tag)}" onclick={handleTagClick} use:createLongPress={{callback: handleTagLongClick, duration: 500}} style="outline: none">{item.text}</a>