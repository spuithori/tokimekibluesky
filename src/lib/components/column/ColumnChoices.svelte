<script lang="ts">
  import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
  import {agent, bookmarkModal, cloudBookmarkModal, cloudListModal, listModal, officialListModal, userLists} from "$lib/stores";
  import {toast} from "svelte-sonner";
  import {migrateLocalList, migrateLocalLists, unmigratedLocalLists as filterUnmigratedLocalLists} from "$lib/localListMigration";
  import {_} from "tokimeki-i18n";
  import {liveQuery} from "dexie";
  import {accountsDb, db} from "$lib/db";
  import {onMount} from "svelte";
  import ColumnListAdder from "$lib/components/column/ColumnListAdder.svelte";
  import {getAccountIdByDidFromDb} from "$lib/util";
  import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
  import HelpCircle from '@lucide/svelte/icons/help-circle';

  let bookmarks = liveQuery(() => db.bookmarks.toArray());

  let { _agent = $agent, onadd } = $props();

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
      {
          id: self.crypto.randomUUID(),
          algorithm: {
              type: 'chatList',
              name: $_('chat_list'),
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

  let atmosphereColumns = [
      {
          id: self.crypto.randomUUID(),
          algorithm: {
              type: 'mochottTimeline',
              name: $_('mochott_timeline'),
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
              type: 'networkFeed',
              name: $_('network_feed'),
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

  let savedFeeds = $state([]);
  let officialLists = $state([]);
  let cloudBookmarks = $state([]);
  let cloudLists = $state([]);
  let feedColumnsRefreshing = $state(true);
  let officialListColumnsRefreshing = $state(true);
  let cloudBookmarkColumnRefreshing = $state(true);
  let cloudListColumnRefreshing = $state(true);
  let migrating = $state(false);
  
  function buildBookmarkColumns(bookmarks) {
      if (!bookmarks) {
          return [];
      }

      return bookmarks
          .filter(bookmark => bookmark.owner === _agent.did())
          .map(bookmark => ({
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
          }));
  }

  function buildListColumns(lists) {
      if (!lists) {
          return [];
      }

      return lists
          .filter(list => list.owner === _agent.did())
          .map(list => ({
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
          }));
  }

  async function updateFeeds() {
      const agent = _agent;
      const accountId = await getAccountIdByDidFromDb(agent.did());
      const account = await accountsDb.accounts.get(accountId);
      const feeds = account?.feeds;
      savedFeeds = feeds || [];

      try {
          savedFeeds = await agent.getSavedFeeds();
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
      const agent = _agent;
      const accountId = await getAccountIdByDidFromDb(agent.did());
      const account = await accountsDb.accounts.get(accountId);
      const lists = account?.lists;
      officialLists = lists || [];

      const res = await agent.xrpc.get('app.bsky.graph.getLists', {actor: agent.did(), limit: 100, cursor: ''});
      officialLists = res.lists.filter(item => item?.purpose !== 'app.bsky.graph.defs#modlist');

      await accountsDb.accounts.update(accountId, {
          lists: $state.snapshot(officialLists),
      });

      officialListColumnsRefreshing = false;
  }

  async function updateCloudBookmarks() {
      const agent = _agent;
      const accountId = await getAccountIdByDidFromDb(agent.did());
      const account = await accountsDb.accounts.get(accountId);
      const bookmarks = account?.cloudBookmarks;
      cloudBookmarks = bookmarks || [];

      const result = await agent.getCloudBookmarks();
      cloudBookmarks = result.bookmarks;

      await accountsDb.accounts.update(accountId, {
          cloudBookmarks: $state.snapshot(cloudBookmarks),
      });

      cloudBookmarkColumnRefreshing = false;
  }

  function buildFeedColumns(feeds) {
      if (!feeds) {
          return [];
      }

      return feeds.map(feed => ({
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
      }))
  }

  function buildOfficialListColumns(lists) {
      if (!lists) {
          return [];
      }

      return lists.map(list => ({
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
      }))
  }

  async function updateCloudLists() {
      const agent = _agent;
      const accountId = await getAccountIdByDidFromDb(agent.did());
      const account = await accountsDb.accounts.get(accountId);
      const lists = account?.cloudLists;
      cloudLists = lists || [];

      try {
          const result = await agent.getCloudLists();
          cloudLists = result.lists;

          await accountsDb.accounts.update(accountId, {
              cloudLists: $state.snapshot(cloudLists),
          });
      } catch (e) {
          console.error(e);
      }

      cloudListColumnRefreshing = false;
  }

  function buildCloudListColumns(lists) {
      if (!lists) {
          return [];
      }

      return lists.map(list => ({
          id: self.crypto.randomUUID(),
          algorithm: {
              type: 'cloudList',
              algorithm: list.id,
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
      }))
  }

  const unmigratedLocalLists = $derived(filterUnmigratedLocalLists($userLists, _agent.did()));
  const migratableListIds = $derived(new Set(unmigratedLocalLists.map(list => String(list.id))));

  function persistLocalLists() {
      userLists.update(lists => {
          localStorage.setItem('lists', JSON.stringify(lists));
          return lists;
      });
  }

  async function refreshCloudListsAfterMigration() {
      cloudListColumnRefreshing = true;
      await updateCloudLists();
  }

  async function handleMigrateAll() {
      if (migrating) {
          return;
      }

      migrating = true;

      const { success, failed } = await migrateLocalLists(_agent, unmigratedLocalLists);
      persistLocalLists();

      if (success) {
          toast.success($_('migrate_local_lists_success'));
      }
      if (failed) {
          toast.error($_('migrate_local_lists_failed'));
      }

      await refreshCloudListsAfterMigration();
      migrating = false;
  }

  async function handleMigrateOne(listId) {
      if (migrating) {
          return;
      }

      const list = unmigratedLocalLists.find(item => String(item.id) === String(listId));
      if (!list) {
          return;
      }

      migrating = true;

      try {
          await migrateLocalList(_agent, list);
          persistLocalLists();
          toast.success($_('migrate_local_lists_success'));
          await refreshCloudListsAfterMigration();
      } catch (e) {
          console.error(e);
          toast.error($_('migrate_local_lists_failed'));
      }

      migrating = false;
  }

  function buildCloudBookmarkColumns(bookmarks) {
      if (!bookmarks) {
          return [];
      }

      return bookmarks.map(bookmark => ({
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
      }))
  }

  onMount(async () => {
      await Promise.all([updateLists(), updateFeeds(), updateCloudBookmarks(), updateCloudLists()]);
  })

  const bookmarkColumns = $derived(buildBookmarkColumns($bookmarks));
  const localListColumns = $derived(buildListColumns($userLists));
  const feedColumns = $derived(buildFeedColumns(savedFeeds));
  const officialListColumns = $derived(buildOfficialListColumns(officialLists));
  const cloudBookmarkColumns = $derived(buildCloudBookmarkColumns(cloudBookmarks));
  const cloudListColumns = $derived(buildCloudListColumns(cloudLists));
</script>

<div>
    <div class="column-adder-group">
        <div class="column-adder-group__heading">
            <p class="column-adder-group__title">{$_('basic_columns')}</p>
        </div>

        <ColumnListAdder {_agent} items={basicColumns} {onadd}></ColumnListAdder>
    </div>

    <div class="column-adder-group">
        <div class="column-adder-group__heading">
            <p class="column-adder-group__title">Atmosphere</p>
        </div>

        <ColumnListAdder {_agent} items={atmosphereColumns} {onadd}></ColumnListAdder>
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
            <ColumnListAdder {_agent} items={cloudBookmarkColumns} {onadd}></ColumnListAdder>
        {:else}
            <p class="column-adder-text">{$_('there_is_no_bookmark')}</p>
        {/if}
    </div>

    <div class="column-adder-group">
        <div class="column-adder-group__heading">
            <p class="column-adder-group__title">{$_('list_cloud')}</p>
            <a href="https://docs.tokimeki.blue/ja/usage/list" target="_blank" rel="noopener" class="column-adder-group__help"><HelpCircle size="18" color="var(--text-color-3)"></HelpCircle></a>

            {#if (cloudListColumnRefreshing)}
                <LoadingSpinner padding="0" size="14"></LoadingSpinner>
            {/if}

            <button class="column-adder-group__add" onclick={() => {cloudListModal.set({open: true, data: undefined})}}>{$_('new_create')}</button>
        </div>

        {#if (cloudListColumns.length)}
            <ColumnListAdder {_agent} items={cloudListColumns} {onadd}></ColumnListAdder>
        {:else}
            <p class="column-adder-text">{$_('there_is_no_cloud_list')}</p>
        {/if}

        {#if (unmigratedLocalLists.length)}
            <button class="column-adder-migrate" onclick={handleMigrateAll} disabled={migrating}>{$_('migrate_local_lists')} ({unmigratedLocalLists.length})</button>
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
            <ColumnListAdder {_agent} items={officialListColumns} {onadd}></ColumnListAdder>
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
            <ColumnListAdder {_agent} items={bookmarkColumns} {onadd}></ColumnListAdder>
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
            <ColumnListAdder {_agent} items={localListColumns} {onadd} migratableIds={migratableListIds} onmigrate={handleMigrateOne}></ColumnListAdder>
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

            <ColumnListAdder {_agent} items={feedColumns} {onadd}></ColumnListAdder>
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

    .column-adder-migrate {
        margin-top: 8px;
        font-size: 13px;
        color: var(--primary-color);

        &:hover {
            text-decoration: underline;
        }

        &:disabled {
            opacity: .5;
        }
    }
</style>