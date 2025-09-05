<script lang="ts">
  import {accountsDb, db} from '$lib/db';
  import {_} from "svelte-i18n";
  import { liveQuery } from 'dexie';
  import { toast } from "svelte-sonner";
  import Menu from "$lib/components/ui/Menu.svelte";
  import {getAccountIdByDidFromDb} from "$lib/util";
  import CloudBookmarkModal from "$lib/components/bookmark/CloudBookmarkModal.svelte";
  import {Bookmark} from "lucide-svelte";

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

          const res = await fetch(`${await _agent.getPdsUrl()}/xrpc/tech.tokimeki.bookmark.getBookmarks?owner=${_agent.did() as string}`, {
              method: 'GET',
              headers: {
                  'atproto-proxy': 'did:web:api.tokimeki.tech#tokimeki_api',
                  Authorization: 'Bearer ' + _agent.getToken(),
                  'Content-Type': 'application/json'
              }
          })

          if (res.status !== 200) {
              throw new Error('failed to get Cloud Bookmark');
          }

          const json = await res.json();

          cloudBookmarks = json.bookmarks;
      } catch (e) {
          cloudBookmarks = [];
      }
  }

  async function getRelatedBookmarks() {
      try {
          const res = await fetch(`${await _agent.getPdsUrl()}/xrpc/tech.tokimeki.bookmark.getRelatedBookmark?owner=${_agent.did() as string}&cid=${post.cid}`, {
              method: 'GET',
              headers: {
                  'atproto-proxy': 'did:web:api.tokimeki.tech#tokimeki_api',
                  Authorization: 'Bearer ' + _agent.getToken(),
                  'Content-Type': 'application/json'
              }
          })
          const json = await res.json();

          if (res.status !== 200) {
              throw new Error('failed to get Cloud Bookmark');
          }

          relatedBookmarks = json.bookmarks;
      } catch (e) {
          console.error(e);
      }
  }

  async function addCloud(id: string) {
      isMenuOpen = false;

      try {
          const res = await fetch(`${await _agent.getPdsUrl()}/xrpc/tech.tokimeki.bookmark.addBookmarkItem`, {
              method: 'POST',
              body: JSON.stringify({
                  bookmark: {
                      bookmark: id,
                      owner: _agent.did() as string,
                      cid: post.cid,
                      uri: post.uri,
                  }
              }),
              headers: {
                  'atproto-proxy': 'did:web:api.tokimeki.tech#tokimeki_api',
                  Authorization: 'Bearer ' + _agent.getToken(),
                  'Content-Type': 'application/json'
              }
          })

          if (res.status !== 200) {
              throw new Error('failed to add Cloud Bookmark');
          }

          toast.success($_('bookmark_save_success'));
      } catch (e) {
          toast.error('Error: ' + e);
      }
  }

  async function deleteCloud(id: string) {
      isMenuOpen = false;

      try {
          const res = await fetch(`${await _agent.getPdsUrl()}/xrpc/tech.tokimeki.bookmark.deleteBookmarkItem`, {
              method: 'POST',
              body: JSON.stringify({
                  bookmark: {
                      bookmark: id,
                      cid: post.cid,
                      owner: _agent.did() as string,
                  }
              }),
              headers: {
                  'atproto-proxy': 'did:web:api.tokimeki.tech#tokimeki_api',
                  Authorization: 'Bearer ' + _agent.getToken(),
                  'Content-Type': 'application/json'
              }
          })

          if (res.status !== 200) {
              throw new Error('failed to add Cloud Bookmark');
          }

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
        await _agent.agent.app.bsky.bookmark.deleteBookmark({uri: post.uri});
      } else {
        await _agent.agent.app.bsky.bookmark.createBookmark({uri: post.uri, cid: post.cid});
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
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--danger-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
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
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-cloud"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
                  {bookmark.name}
                </button>
              </li>
            {:else}
              <li class="timeline-menu-list__item timeline-menu-list__item--mute">
                <button class="timeline-menu-list__button timeline-menu-list__button--bookmark" onclick={() => {deleteCloud(bookmark.id)}}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-cloud"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
                  {bookmark.name}
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--danger-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                </button>
              </li>
            {/if}
          {/each}
        {/if}

        <li class="timeline-menu-list__item">
          <button class="timeline-menu-list__button timeline-menu-list__button--bookmark" onclick={toggleOfficialBookmark}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bookmark-check-icon lucide-bookmark-check"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z"/><path d="m9 10 2 2 4-4"/></svg>
            {$_('official_bookmark')}
          </button>
        </li>

        <li class="timeline-menu-list__item">
          <button class="timeline-menu-list__button timeline-menu-list__button--bookmark" onclick={() => {isModalOpen = true}}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-plus"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
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