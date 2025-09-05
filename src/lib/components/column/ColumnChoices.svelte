<script lang="ts">
  import { run } from 'svelte/legacy';

  import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
  import {agent, bookmarkModal, cloudBookmarkModal, listModal, officialListModal, userLists} from "$lib/stores";
  import {_} from "svelte-i18n";
  import {liveQuery} from "dexie";
  import {accountsDb, db} from "$lib/db";
  import {onMount} from "svelte";
  import ColumnListAdder from "$lib/components/column/ColumnListAdder.svelte";
  import {getAccountIdByDidFromDb} from "$lib/util";
  import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
  import { HelpCircle } from 'lucide-svelte';

  let bookmarks = liveQuery(() => db.bookmarks.toArray());

  let { _agent = $agent } = $props();

  let basicColumns = [
      {
          id: self.crypto.randomUUID(),
          algorithm: {
              type: 'default',
              name: 'HOME',
          },
          style: 'default',
          settings: defaultDeckSettings,
          did: _agent.did(),
          handle: _agent.handle(),
          data: {
              feed: [],
              cursor: '',
          }
      },
      {
          id: self.crypto.randomUUID(),
          algorithm: {
              type: 'notification',
              name: $_('notifications'),
          },
          style: 'default',
          settings: defaultDeckSettings,
          did: _agent.did(),
          handle: _agent.handle(),
          data: {
              feed: [],
              cursor: '',
          }
      },
      {
          id: self.crypto.randomUUID(),
          algorithm: {
              type: 'myPost',
              name: $_('my_post'),
          },
          style: 'default',
          settings: defaultDeckSettings,
          did: _agent.did(),
          handle: _agent.handle(),
          data: {
              feed: [],
              cursor: '',
          }
      },
      {
          id: self.crypto.randomUUID(),
          algorithm: {
              type: 'myMedia',
              name: $_('my_media'),
          },
          style: 'default',
          settings: defaultDeckSettings,
          did: _agent.did(),
          handle: _agent.handle(),
          data: {
              feed: [],
              cursor: '',
          }
      },
      {
          id: self.crypto.randomUUID(),
          algorithm: {
              type: 'like',
              name: $_('likes'),
          },
          style: 'default',
          settings: defaultDeckSettings,
          did: _agent.did(),
          handle: _agent.handle(),
          data: {
              feed: [],
              cursor: '',
          }
      },
      {
          id: self.crypto.randomUUID(),
          algorithm: {
              type: 'officialBookmark',
              name: $_('official_bookmark'),
          },
          style: 'default',
          settings: defaultDeckSettings,
          did: _agent.did(),
          handle: _agent.handle(),
          data: {
              feed: [],
              cursor: '',
          }
      },
  ];

  let bookmarkColumns = $state([]);
  let cloudBookmarkColumns = $state([]);
  let localListColumns = $state([]);
  let officialListColumns = $state([]);
  let feedColumns = $state([]);
  let savedFeeds = $state([]);
  let officialLists = $state([]);
  let cloudBookmarks = $state([]);
  let feedColumnsRefreshing = $state(true);
  let officialListColumnsRefreshing = $state(true);
  let cloudBookmarkColumnRefreshing = $state(true);
  
  function updateBookmark(bookmarks) {
      if (!bookmarks) {
          return false;
      }

      bookmarkColumns = [];

      bookmarks.forEach(bookmark => {
          if (bookmark.owner === _agent.did()) {
              bookmarkColumns = [...bookmarkColumns, {
                  id: self.crypto.randomUUID(),
                  algorithm: {
                      type: 'bookmark',
                      algorithm: String(bookmark.id),
                      name: bookmark.name,
                      list: String(bookmark.id),
                  },
                  style: 'default',
                  settings: defaultDeckSettings,
                  did: _agent.did(),
                  handle: _agent.handle(),
                  data: {
                      feed: [],
                      cursor: '',
                  }
              }]
          }
      });
  }

  function updateList(lists) {
      if (!lists) {
          return false;
      }

      localListColumns = [];

      lists.forEach(list => {
          if (list.owner === _agent.did()) {
              localListColumns = [...localListColumns, {
                  id: self.crypto.randomUUID(),
                  algorithm: {
                      type: 'list',
                      algorithm: String(list.id),
                      name: list.name,
                      list: String(list.id),
                  },
                  style: 'default',
                  settings: defaultDeckSettings,
                  did: _agent.did(),
                  handle: _agent.handle(),
                  data: {
                      feed: [],
                      cursor: '',
                  }
              }]
          }
      });
  }

  async function updateFeeds() {
      const accountId = await getAccountIdByDidFromDb(_agent.did());
      const account = await accountsDb.accounts.get(accountId);
      const feeds = account?.feeds;
      savedFeeds = feeds || [];

      try {
          savedFeeds = await _agent.getSavedFeeds();
          await accountsDb.accounts.update(accountId, {
              feeds: $state.snapshot(savedFeeds),
          });
      } catch (e) {
          await accountsDb.accounts.update(accountId, {
              feeds: [],
          });
      }

      feedColumnsRefreshing = false;
  }

  async function updateLists() {
      const accountId = await getAccountIdByDidFromDb(_agent.did());
      const account = await accountsDb.accounts.get(accountId);
      const lists = account?.lists;
      officialLists = lists || [];

      const res = await _agent.agent.api.app.bsky.graph.getLists({actor: _agent.did(), limit: 100, cursor: ''});
      officialLists = res.data.lists.filter(item => item?.purpose !== 'app.bsky.graph.defs#modlist');

      await accountsDb.accounts.update(accountId, {
          lists: $state.snapshot(officialLists),
      });

      officialListColumnsRefreshing = false;
  }

  async function updateCloudBookmarks() {
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

      await accountsDb.accounts.update(accountId, {
          cloudBookmarks: $state.snapshot(cloudBookmarks),
      });

      cloudBookmarkColumnRefreshing = false;
  }

  function applyFeedColumns(feeds) {
      if (!feeds) {
          return false;
      }
      
      feedColumns = feeds.map(feed => {
          return {
              id: self.crypto.randomUUID(),
              algorithm: {
                  type: 'custom',
                  algorithm: feed.uri,
                  name: feed.name,
              },
              style: 'default',
              settings: defaultDeckSettings,
              did: _agent.did(),
              handle: _agent.handle(),
              data: {
                  feed: [],
                  cursor: '',
              }
          }
      })
  }

  function applyOfficialListColumns(lists) {
      officialListColumns = lists.map(list => {
          return  {
              id: self.crypto.randomUUID(),
              algorithm: {
                  type: 'officialList',
                  algorithm: list.uri,
                  name: list.name,
              },
              style: 'default',
              settings: defaultDeckSettings,
              did: _agent.did(),
              handle: _agent.handle(),
              data: {
                  feed: [],
                  cursor: '',
              }
          }
      })
  }

  function applyCloudBookmarkColumns(bookmarks) {
      cloudBookmarkColumns = bookmarks.map(bookmark => {
          return  {
              id: self.crypto.randomUUID(),
              algorithm: {
                  type: 'cloudBookmark',
                  algorithm: bookmark.id,
                  name: bookmark.name,
              },
              style: 'default',
              settings: defaultDeckSettings,
              did: _agent.did(),
              handle: _agent.handle(),
              data: {
                  feed: [],
                  cursor: '',
              }
          }
      })
  }

  onMount(async () => {
      await Promise.all([updateLists(), updateFeeds(), updateCloudBookmarks()]);
  })
  run(() => {
    updateBookmark($bookmarks);
  });
  run(() => {
    updateList($userLists);
  });
  run(() => {
    applyFeedColumns(savedFeeds);
  });
  run(() => {
    applyOfficialListColumns(officialLists);
  });
  run(() => {
    applyCloudBookmarkColumns(cloudBookmarks);
  });
</script>

<div>
    <div class="column-adder-group">
        <div class="column-adder-group__heading">
            <p class="column-adder-group__title">{$_('basic_columns')}</p>
        </div>

        <ColumnListAdder {_agent} items={basicColumns} on:add></ColumnListAdder>
    </div>

    <div class="column-adder-group">
        <div class="column-adder-group__heading">
            <p class="column-adder-group__title">{$_('bookmark_cloud')}</p>
            <a href="https://docs.tokimeki.blue/ja/usage/bookmark-cloud" target="_blank" rel="noopener" class="column-adder-group__help"><HelpCircle size="18" color="var(--text-color-3)"></HelpCircle></a>

            {#if (cloudBookmarkColumnRefreshing)}
                <LoadingSpinner padding="0" size="14"></LoadingSpinner>
            {/if}

            <button class="column-adder-group__add" onclick={() => {cloudBookmarkModal.set({open: true, data: undefined})}}>{$_('new_create')}</button>
        </div>

        {#if (cloudBookmarkColumns.length)}
            <ColumnListAdder {_agent} items={cloudBookmarkColumns} on:add></ColumnListAdder>
        {:else}
            <p class="column-adder-text">{$_('there_is_no_bookmark')}</p>
        {/if}
    </div>

    <div class="column-adder-group">
        <div class="column-adder-group__heading">
            <p class="column-adder-group__title">{$_('official_list_columns')}</p>
            <a href="https://docs.tokimeki.blue/ja/usage/list#%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E3%83%AA%E3%82%B9%E3%83%88%E3%81%A8%E3%81%AF" target="_blank" rel="noopener" class="column-adder-group__help"><HelpCircle size="18" color="var(--text-color-3)"></HelpCircle></a>

            {#if (officialListColumnsRefreshing)}
                <LoadingSpinner padding="0" size="14"></LoadingSpinner>
            {/if}

            <button class="column-adder-group__add" onclick={() => {$officialListModal.open = true}}>{$_('new_create')}</button>
        </div>

        {#if (officialListColumns.length)}
            <ColumnListAdder {_agent} items={officialListColumns} on:add></ColumnListAdder>
        {:else}
            <p class="column-adder-text">{$_('there_is_no_official_list')}</p>
        {/if}
    </div>

    <div class="column-adder-group">
        <div class="column-adder-group__heading">
            <p class="column-adder-group__title">{$_('bookmark_local')}</p>
            <a href="https://docs.tokimeki.blue/ja/usage/bookmark" target="_blank" rel="noopener" class="column-adder-group__help"><HelpCircle size="18" color="var(--text-color-3)"></HelpCircle></a>

            <button class="column-adder-group__add" onclick={() => {bookmarkModal.set({open: true, data: undefined})}}>{$_('new_create')}</button>
        </div>

        {#if (bookmarkColumns.length)}
            <ColumnListAdder {_agent} items={bookmarkColumns} on:add></ColumnListAdder>
        {:else}
            <p class="column-adder-text">{$_('there_is_no_bookmark')}</p>
        {/if}
    </div>

    <div class="column-adder-group">
        <div class="column-adder-group__heading">
            <p class="column-adder-group__title">{$_('local_list_columns')}</p>
            <a href="https://docs.tokimeki.blue/ja/usage/list#%E3%83%AD%E3%83%BC%E3%82%AB%E3%83%AB%E3%83%AA%E3%82%B9%E3%83%88%E3%81%A8%E3%81%AF" target="_blank" rel="noopener" class="column-adder-group__help"><HelpCircle size="18" color="var(--text-color-3)"></HelpCircle></a>

            <button class="column-adder-group__add" onclick={() => {listModal.set({open: true, data: undefined })}}>{$_('new_create')}</button>
        </div>

        {#if (localListColumns.length)}
            <ColumnListAdder {_agent} items={localListColumns} on:add></ColumnListAdder>
        {:else}
            <p class="column-adder-text">{$_('there_is_no_local_list')}</p>
        {/if}
    </div>
</div>

<div>
    {#if (feedColumns.length)}
        <div class="column-adder-group">
            <div class="column-adder-group__heading">
                <p class="column-adder-group__title">{$_('feed_columns')}</p>

                {#if (feedColumnsRefreshing)}
                    <LoadingSpinner padding="0" size="14"></LoadingSpinner>
                {/if}
            </div>

            <ColumnListAdder {_agent} items={feedColumns} on:add></ColumnListAdder>
        </div>
    {/if}
</div>

<style lang="postcss">
    .column-adder-group {
        margin-bottom: 24px;

        &__heading {
            display: flex;
            align-items: center;
            gap: 4px;
            font-weight: bold;
            margin-bottom: 8px;
            font-size: 14px;
            letter-spacing: .025em;
        }

        &__title {

        }

        &__add {
            color: var(--primary-color);
            margin-left: auto;

            &:hover {
                text-decoration: underline;
            }
        }
    }

    .column-adder-text {
        font-size: 14px;
        color: var(--text-color-3);
    }
</style>