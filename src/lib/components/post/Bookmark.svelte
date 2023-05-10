<script lang="ts">
  import {_} from "svelte-i18n";
  import { agent, timeline, supabase, supabaseSession, bookmarks } from '$lib/stores';
  import toast from "svelte-french-toast";
  import { clickOutside } from '$lib/clickOutSide';
  import { fade, fly } from 'svelte/transition';

  export let post;
  export let bookmarkId = undefined;
  let isMenuOpen = false;

  async function add(bookmarkId: string) {
      const { error } = await $supabase
          .from('feeds')
          .upsert({
              bookmark: bookmarkId,
              owner: $agent.did(),
              cid: post.cid,
              indexed_at: Date.now(),
              created_at: post.record.createdAt,
              text: post.record.text,
              author: post.author.did,
              uri: post.uri,
              user_id: $supabaseSession.user.id
          }, {onConflict: 'bookmark, cid'})
          .single()

      if (error) {
          toast.error($_('error') + ': ' + error.message);
          throw new Error(error.message);
      }

      toast.success($_('bookmark_add_success'));

      isMenuOpen = false;
  }

  async function deleteBookmark() {
      const { error } = await $supabase
          .from('feeds')
          .delete()
          .eq('id', bookmarkId)

      if (error) {
          toast.error($_('error') + ': ' + error.message);
          throw new Error(error.message);
      }

      toast.success($_('bookmark_delete_success'));

      timeline.update(function (tl) {
          return tl.filter(data => data.bookmarkId !== bookmarkId);
      });
  }

  function toggleMenu() {
      isMenuOpen = !isMenuOpen;
  }
</script>

<div class="bookmark-wrap">
  <div class="timeline-reaction__item timeline-reaction__item--bookmark">
    <button class="timeline-reaction__icon bookmark-menu-toggle--{post.cid}" on:click="{toggleMenu}" aria-label="Bookmark">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="15" viewBox="0 0 12 15">
        <path id="bookmark" d="M2,1.5A1.5,1.5,0,0,1,3.5,0h9A1.5,1.5,0,0,1,14,1.5V15L8,12,2,15Z" transform="translate(-2)" fill="var(--border-color-1)"/>
      </svg>
    </button>
  </div>

  {#if isMenuOpen}
    <nav
        class="timeline-menu timeline-menu--bookmark"
        class:timeline-menu--shown={isMenuOpen}
        use:clickOutside={{ignoreElement: '.bookmark-menu-toggle--' + post.cid}}
        on:outclick={() => (isMenuOpen = false)}
        transition:fly="{{ y: 30, duration: 250 }}"
    >
      <ul class="timeline-menu-list">
        {#if ($bookmarks)}
          {#each $bookmarks as bookmark}
            <li class="timeline-menu-list__item timeline-menu-list__item--mute">
              <button class="timeline-menu-list__button timeline-menu-list__button--bookmark" on:click={() => {add(bookmark.id)}}>{bookmark.name}</button>
            </li>
          {:else}
            <li class="timeline-menu-list__item timeline-menu-list__item--mute">
              <button class="timeline-menu-list__button timeline-menu-list__button--bookmark">{$_('no_bookmark_folder')}</button>
            </li>
          {/each}
        {/if}

        {#if (bookmarkId)}
          <li class="timeline-menu-list__item timeline-menu-list__item--mute">
            <button class="timeline-menu-list__button timeline-menu-list__button--bookmark"  on:click={deleteBookmark}><span class="text-danger">{$_('delete_bookmark')}</span></button>
          </li>
        {/if}
      </ul>
    </nav>
  {/if}
</div>

<style lang="postcss">
  .bookmark-wrap {
      position: relative;
  }
</style>