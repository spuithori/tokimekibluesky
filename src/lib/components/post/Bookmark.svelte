<script lang="ts">
  import { db } from '$lib/db';
  import {_} from "svelte-i18n";
  import { liveQuery } from 'dexie';
  import { agent } from '$lib/stores';
  import toast from "svelte-french-toast";
  import { clickOutside } from '$lib/clickOutSide';
  import { fade, fly } from 'svelte/transition';

  export let post;
  let isMenuOpen = false;

  $: bookmarks = liveQuery(async () => {
      const bookmarks = await db.bookmarks
          .toArray();

      return bookmarks;
  })

  async function add(bookmarkId: string) {
      try {
          const id = await db.feeds.add({
              bookmark: bookmarkId,
              owner: $agent.did(),
              cid: post.cid,
              indexedAt: Date.now(),
              createdAt: post.record.createdAt,
              text: post.record.text,
              author: post.author.did,
              uri: post.uri,
          })

          toast.success('Success');
      } catch (e) {
          toast.error('Error: ' + e);
      }
  }

  function toggleMenu() {
      isMenuOpen = !isMenuOpen;
  }
</script>

<div class="bookmark-wrap">
  <div class="timeline-reaction__item timeline-reaction__item--bookmark">
    <button class="timeline-reaction__icon bookmark-menu-toggle--{post.cid}" on:click="{toggleMenu}" aria-label="Bookmark">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="15" viewBox="0 0 12 15">
        <path id="bookmark" d="M2,1.5A1.5,1.5,0,0,1,3.5,0h9A1.5,1.5,0,0,1,14,1.5V15L8,12,2,15Z" transform="translate(-2)" fill="#e0e0e0"/>
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
              <button class="timeline-menu-list__button" on:click={() => {add(bookmark.id)}}>{bookmark.name}</button>
            </li>
          {/each}
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