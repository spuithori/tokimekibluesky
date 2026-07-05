<script lang="ts">
    import Trash2 from '@lucide/svelte/icons/trash-2';
    import Cloud from '@lucide/svelte/icons/cloud';
    import BookmarkCheck from '@lucide/svelte/icons/bookmark-check';
    import CirclePlus from '@lucide/svelte/icons/circle-plus';
  import {accountsDb, db} from '$lib/db';
  import {_} from "tokimeki-i18n";
  import { liveQuery } from 'dexie';
  import { toast } from "svelte-sonner";
  import Menu from "$lib/components/ui/Menu.svelte";
  import {getAccountIdByDidFromDb} from "$lib/util";
  import CloudBookmarkModal from "$lib/components/bookmark/CloudBookmarkModal.svelte";
  import Bookmark from '@lucide/svelte/icons/bookmark';

  let { _agent, post } = $props();
  let cloudBookmarks = $state([]);
  let relatedBookmarks = $state([]);
  let isMenuOpen = $state(false);
  let alreadyBookmarks = $state([]);
  let isModalOpen = $state(false);

  let bookmarks = $derived(liveQuery(async () => {
      const bookmarks = await db.bookmarks
          .where('owner')
          .equals(_agent.did())
          .toArray();
      return bookmarks;
  }))

  function initBookmarks() {
    getCloudBookmarks();
    getRelatedBookmarks();
    const res = db.feeds
      .where('uri')
      .equals(post.uri)
      .toArray()
      .then(result => {
        alreadyBookmarks = result;
      })
      .catch(error => {
        console.error(error);
      });

    if (isModalOpen) {
      isMenuOpen = true;
    }

    isModalOpen = false;
  }

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

  async function deleteBookmark(_id) {
      try {
          const id = await db.feeds.delete(_id);

          toast.success($_('bookmark_delete_success'));
      } catch (e) {
          toast.error($_('error') + ': ' + e);
      }

      isMenuOpen = false;
  }
  
  async function getCloudBookmarks() {
      try {
          const accountId = await getAccountIdByDidFromDb(_agent.did());
          const account = await accountsDb.accounts.get(accountId);
          const bookmarks = account?.cloudBookmarks;
          cloudBookmarks = bookmarks || [];

          const result = await _agent.getCloudBookmarks();
          cloudBookmarks = result.bookmarks;
      } catch (e) {
          cloudBookmarks = [];
      }
  }

  async function getRelatedBookmarks() {
      try {
          const result = await _agent.getRelatedCloudBookmark(post.cid);
          relatedBookmarks = result.bookmarks;
      } catch (e) {
          console.error(e);
      }
  }

  async function addCloud(id: number) {
      isMenuOpen = false;

      try {
          await _agent.addCloudBookmarkItem(id, post.uri, post.cid);
          toast.success($_('bookmark_save_success'));
      } catch (e) {
          toast.error('Error: ' + e);
      }
  }

  async function deleteCloud(id: number) {
      isMenuOpen = false;

      try {
          await _agent.deleteCloudBookmarkItem(id, post.uri, post.cid);
          relatedBookmarks = relatedBookmarks.filter(_bookmark => _bookmark !== id);
          toast.success($_('bookmark_delete_success'));
      } catch (e) {
          toast.error('Error: ' + e);
      }
  }

  async function toggleOfficialBookmark() {
    isMenuOpen = false;

    try {
      if (post?.viewer?.bookmarked) {
        await _agent.xrpc.post('app.bsky.bookmark.deleteBookmark', {uri: post.uri});
      } else {
        await _agent.xrpc.post('app.bsky.bookmark.createBookmark', {uri: post.uri, cid: post.cid});
      }

      toast.success($_('bookmark_save_success'));
    } catch (e) {
      console.error(e);
    }
  }
</script>

<div class="bookmark-wrap">
  <Menu bind:isMenuOpen={isMenuOpen} onopen={initBookmarks} buttonClassName="timeline-reaction__item timeline-reaction__item--bookmark">
    {#snippet ref()}
      <span class="timeline-reaction__icon">
        <Bookmark size="16" color={post?.viewer?.bookmarked ? 'var(--primary-color)' : 'var(--timeline-reaction-bookmark-icon-color)'} fill={post?.viewer?.bookmarked ? 'var(--primary-color)' : 'transparent'} absoluteStrokeWidth={true} strokeWidth="1.5"></Bookmark>
      </span>
    {/snippet}

    {#snippet content()}
      <ul  class="timeline-menu-list">
        {#if ($bookmarks)}
          {#each $bookmarks as bookmark}
            <li class="timeline-menu-list__item timeline-menu-list__item--mute">
              {#if (alreadyBookmarks.some(already => already.bookmark === bookmark.id))}
                <li class="timeline-menu-list__item timeline-menu-list__item--mute">
                  <button class="timeline-menu-list__button timeline-menu-list__button--bookmark" onclick={() => {deleteBookmark(alreadyBookmarks[0].id)}}>
                    {bookmark.name}
                    <Trash2 size={18} color="var(--danger-color)" />
                  </button>
                </li>
              {:else}
                <button class="timeline-menu-list__button timeline-menu-list__button--bookmark" onclick={() => {add(bookmark.id)}}>
                  {bookmark.name}
                </button>
              {/if}
            </li>
          {:else}
            {#if (!cloudBookmarks.length)}
              <li class="timeline-menu-list__item timeline-menu-list__item--mute">
                <button class="timeline-menu-list__button timeline-menu-list__button--bookmark">{$_('no_bookmark_folder')}</button>
              </li>
            {/if}
          {/each}
        {/if}

        {#if cloudBookmarks}
          {#each cloudBookmarks as bookmark}
            {#if !relatedBookmarks.includes(bookmark.id)}
              <li class="timeline-menu-list__item timeline-menu-list__item--mute">
                <button class="timeline-menu-list__button timeline-menu-list__button--bookmark" onclick={() => {addCloud(bookmark.id)}}>
                  <Cloud size={20} />
                  {bookmark.name}
                </button>
              </li>
            {:else}
              <li class="timeline-menu-list__item timeline-menu-list__item--mute">
                <button class="timeline-menu-list__button timeline-menu-list__button--bookmark" onclick={() => {deleteCloud(bookmark.id)}}>
                  <Cloud size={20} />
                  {bookmark.name}
                  <Trash2 size={18} color="var(--danger-color)" />
                </button>
              </li>
            {/if}
          {/each}
        {/if}

        <li class="timeline-menu-list__item">
          <button class="timeline-menu-list__button timeline-menu-list__button--bookmark" onclick={toggleOfficialBookmark}>
            <BookmarkCheck size={20} />
            {$_('official_bookmark')}
          </button>
        </li>

        <li class="timeline-menu-list__item">
          <button class="timeline-menu-list__button timeline-menu-list__button--bookmark" onclick={() => {isModalOpen = true}}>
            <CirclePlus size={20} color="var(--primary-color)" />
            {$_('new_create')}
          </button>
        </li>
      </ul>
    {/snippet}
  </Menu>
</div>

{#if (isModalOpen)}
  <CloudBookmarkModal id={undefined} close={initBookmarks} {_agent}></CloudBookmarkModal>
{/if}

<style lang="postcss">
  .bookmark-wrap {
      position: relative;
  }

  .timeline-reaction__icon {
      &:hover {
          @media (min-width: 768px) {
              --timeline-reaction-bookmark-icon-color: var(--timeline-reaction-bookmark-icon-hover-color);

              &::after {
                  background-color: var(--timeline-reaction-bookmark-hover-bg-color);
              }
          }
      }
  }
</style>