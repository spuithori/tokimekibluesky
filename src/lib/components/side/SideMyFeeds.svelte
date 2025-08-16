<script lang="ts">
    import {agent} from "$lib/stores";
    import {liveQuery} from "dexie";
    import {accountsDb, db} from "$lib/db";
    import {createEventDispatcher, onMount} from "svelte";
    import {Bookmark, List, Newspaper} from "lucide-svelte";
    import { m } from "$lib/paraglide/messages.js";
    import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
    import {getAccountIdByDidFromDb} from "$lib/util";
    const dispatch = createEventDispatcher();

  let { _agent = $agent } = $props();

    type tab = 'all' | 'feeds' | 'lists' | 'bookmarks';
    let currentTab: tab = $state('all');
    let customFeeds = $state([]);
    let officialLists = $state([]);
    let cloudBookmarks = $state([]);
    let bookmarks = liveQuery(() => db.bookmarks.toArray());
    let loaded = $state(false);

    async function updateLists() {
        const accountId = await getAccountIdByDidFromDb(_agent.did());
        const account = await accountsDb.accounts.get(accountId);
        officialLists = account?.lists;

        const res = await _agent.agent.api.app.bsky.graph.getLists({actor: _agent.did() as string, limit: 100, cursor: ''});
        officialLists = res.data.lists.filter(item => item?.purpose !== 'app.bsky.graph.defs#modlist');

        await accountsDb.accounts.update(accountId, {
            lists: $state.snapshot(officialLists),
        });
    }

    async function updateFeeds() {
        const accountId = await getAccountIdByDidFromDb(_agent.did());
        const account = await accountsDb.accounts.get(accountId);
        customFeeds = account?.feeds;
        customFeeds = await $agent.getSavedFeeds();

        await accountsDb.accounts.update(accountId, {
            feeds: $state.snapshot(customFeeds),
        });
    }

    async function updateCloudBookmarks() {
        const accountId = await getAccountIdByDidFromDb(_agent.did());
        const account = await accountsDb.accounts.get(accountId);
        const bookmarks = account?.cloudBookmarks;
        cloudBookmarks = bookmarks || [];

        try {
            const res = await fetch(`${await _agent.getPdsUrl()}/xrpc/tech.tokimeki.bookmark.getBookmarks?owner=${_agent.did() as string}`, {
                method: 'GET',
                headers: {
                    'atproto-proxy': 'did:web:api.tokimeki.tech#tokimeki_api',
                    Authorization: 'Bearer ' + _agent.getToken(),
                    'Content-Type': 'application/json'
                }
            })
            const json = await res.json();
            cloudBookmarks = json.bookmarks;

            await accountsDb.accounts.update(accountId, {
                cloudBookmarks: $state.snapshot(cloudBookmarks),
            });
        } catch (e) {
            cloudBookmarks = [];
        }
    }

    function getFeedUrl(uri, genre = 'feed') {
        if (!uri) {
            return false;
        }

        const did = uri.split('/')[2];
        const name = uri.split('/')[4];
        return '/profile/' + did + '/' + genre + '/' + name;
    }

    function selectCategory(genre) {
        currentTab = genre;
    }

    function handleSelect() {
        dispatch('close');
    }

    onMount(async () => {
        await Promise.all([updateFeeds(), updateLists(), updateCloudBookmarks()]);
        loaded = true;
    })
</script>

<div class="side-feeds">
  <div class="side-feeds-nav">
    <ul class="profile-tab profile-tab--small">
      <li class="profile-tab__item" onclick={() => {selectCategory('all')}} class:profile-tab__item--active={currentTab === 'all'}><button>{m.all()}</button></li>

      <li class="profile-tab__item" onclick={() => {selectCategory('feeds')}} class:profile-tab__item--active={currentTab === 'feeds'}><button>{m.feeds()}</button></li>

      <li class="profile-tab__item" onclick={() => {selectCategory('lists')}} class:profile-tab__item--active={currentTab === 'lists'}><button>{m.lists()}</button></li>

      <li class="profile-tab__item" onclick={() => {selectCategory('bookmarks')}} class:profile-tab__item--active={currentTab === 'bookmarks'}><button>{m.bookmarks_short()}</button></li>
    </ul>
  </div>

    <div class="side-feeds-content">
        {#if (currentTab === 'feeds' || currentTab === 'all')}
            <div class="side-feeds-list" data-category="feeds">
                {#if customFeeds.length}
                    {#each customFeeds as feed}
                        <li class="side-feeds-list__item">
                            <a class="side-feeds-list__link" href="{getFeedUrl(feed.uri, 'feed')}" onclick={handleSelect}>
                                <Newspaper color="var(--text-color-1)" size="20"></Newspaper>
                                {feed.name}</a>
                        </li>
                    {/each}
                {/if}
            </div>
        {/if}

        {#if (currentTab === 'lists' || currentTab === 'all')}
            <div class="side-feeds-list" data-category="lists">
                {#if officialLists.length}
                    {#each officialLists as list}
                        <li class="side-feeds-list__item">
                            <a class="side-feeds-list__link" href="{getFeedUrl(list.uri, 'lists')}" onclick={handleSelect}>
                                <List color="var(--text-color-1)" size="20"></List>
                                {list.name}</a>
                        </li>
                    {/each}
                {/if}
            </div>
        {/if}

        {#if (currentTab === 'bookmarks' || currentTab === 'all')}
            <div class="side-feeds-list" data-category="bookmarks">
                {#if ($bookmarks)}
                    {#each $bookmarks as bookmark}
                        {#if (bookmark.owner === $agent.did())}
                            <li class="side-feeds-list__item">
                                <a class="side-feeds-list__link" href="/bookmark/{bookmark.id}" onclick={handleSelect}>
                                    <Bookmark color="var(--text-color-1)" size="20"></Bookmark>
                                    {bookmark.name}</a>
                            </li>
                        {/if}
                    {/each}
                {/if}

                {#if cloudBookmarks.length}
                  {#each cloudBookmarks as bookmark}
                    <li class="side-feeds-list__item">
                      <a class="side-feeds-list__link" href="/bookmark-cloud/{bookmark.id}" onclick={handleSelect}>
                        <Bookmark color="var(--text-color-1)" size="20"></Bookmark>
                        {bookmark.name}</a>
                    </li>
                  {/each}
                {/if}
            </div>
        {/if}
    </div>

    {#if (!loaded)}
        <div class="side-feeds-loading">
            <LoadingSpinner padding="8" size="20"></LoadingSpinner>
        </div>
    {/if}
</div>

<style lang="postcss">
  .side-feeds {
      position: relative;
  }

  .side-feeds-loading {
      position: absolute;
      top: 0;
      right: 0;
  }

  .side-feeds-nav {
      color: var(--text-color-3);
  }

  .side-feeds-content {
      padding: 16px;
  }

  .side-feeds-list {
      list-style: none;
      display: grid;
      gap: 8px;
      margin-bottom: 12px;

      &__item {
          position: relative;
          font-size: 14px;
      }

      &__link {
          height: 44px;
          display: flex;
          align-items: center;
          padding: 0 12px;
          border: 2px solid var(--bg-color-2);
          background-color: var(--bg-color-2);
          border-radius: var(--border-radius-3);
          color: var(--text-color-1);
          font-weight: bold;
          gap: 8px;
          letter-spacing: .025em;
      }
  }
</style>