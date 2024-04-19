<script lang="ts">
  import { db } from '$lib/db';
  import {_} from "svelte-i18n";
  import { liveQuery } from 'dexie';
  import { agent } from '$lib/stores';
  import { toast } from "svelte-sonner";
  import Menu from "$lib/components/ui/Menu.svelte";

  export let _agent = $agent;
  export let post;
  export let bookmarkId = undefined;
  let isMenuOpen = false;

  $: bookmarks = liveQuery(async () => {
      const bookmarks = await db.bookmarks
          .where('owner')
          .equals(_agent.did())
          .toArray();

      return bookmarks;
  })

  $: alreadyBookmarks = liveQuery(async () => {
      if (isMenuOpen) {
          const feeds = await db.feeds
              .where('uri')
              .equals(post.uri)
              .toArray();

          return feeds;
      }
  })

  async function add(bookmarkId: string) {
      try {
          const id = await db.feeds.add({
              bookmark: bookmarkId,
              owner: _agent.did(),
              cid: post.cid,
              indexedAt: Date.now(),
              createdAt: post.record.createdAt,
              text: post.record.text,
              author: post.author.did,
              uri: post.uri,
          })

          toast.success($_('bookmark_add_success'));
      } catch (e) {
          if (e.name === 'ConstraintError') {
              toast.error($_('error_may_duplicate_bookmark'));
          } else {
              toast.error($_('error') + ': ' + e);
          }
      }

      isMenuOpen = false;
  }

  async function deleteBookmark() {
      try {
          console.log(bookmarkId)
          const id = await db.feeds.delete(bookmarkId);

          /* timelines.update(function (tls) {
              return tls.map(tl => {
                  return tl.filter(data => data.bookmarkId !== bookmarkId);
              });
          }); */

          toast.success($_('bookmark_delete_success'));
      } catch (e) {
          toast.error($_('error') + ': ' + e);
      }
  }

  function toggleMenu() {
      isMenuOpen = !isMenuOpen;
  }
</script>

<div class="bookmark-wrap">
  <Menu bind:isMenuOpen={isMenuOpen} buttonClassName="timeline-reaction__item timeline-reaction__item--bookmark">
    <span class="timeline-reaction__icon" slot="ref">
         <svg xmlns="http://www.w3.org/2000/svg" width="12" height="15" viewBox="0 0 12 15">
      <path id="bookmark" d="M2,1.5A1.5,1.5,0,0,1,3.5,0h9A1.5,1.5,0,0,1,14,1.5V15L8,12,2,15Z" transform="translate(-2)" fill="var(--timeline-reaction-bookmark-icon-color)"/>
    </svg>
    </span>

    <ul slot="content" class="timeline-menu-list">
      {#if ($bookmarks)}
        {#each $bookmarks as bookmark}
          <li class="timeline-menu-list__item timeline-menu-list__item--mute">
            <button class="timeline-menu-list__button timeline-menu-list__button--bookmark" on:click={() => {add(bookmark.id)}}>
              {bookmark.name}

              {#if ($alreadyBookmarks)}
                {#if ($alreadyBookmarks.some(already => already.bookmark === bookmark.id))}
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="9.75" viewBox="0 0 13 9.75">
                    <path id="checkmark" d="M0,8.2,1.3,6.9l3.25,3.25L11.7,3,13,4.3,4.55,12.75Z" transform="translate(0 -3)" fill="var(--color-theme-10)"/>
                  </svg>
                {/if}
              {/if}
            </button>
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
  </Menu>
</div>

<style lang="postcss">
  .bookmark-wrap {
      position: relative;
  }
</style>