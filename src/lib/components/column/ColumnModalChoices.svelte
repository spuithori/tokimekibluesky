<script lang="ts">
  import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
  import {agent, userLists} from "$lib/stores";
  import {_} from "svelte-i18n";
  import {liveQuery} from "dexie";
  import {db} from "$lib/db";
  import {onMount} from "svelte";
  import ColumnListAdder from "$lib/components/column/ColumnListAdder.svelte";
  import FeedsObserver from "$lib/components/feeds/FeedsObserver.svelte";

  let bookmarks = liveQuery(() => db.bookmarks.toArray());

  export let _agent = $agent;

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
  ];

  basicColumns = [...basicColumns, {
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
  }];

  let bookmarkColumns = [];
  let localListColumns = [];
  let officialListColumns = [];
  let feedColumns = [];
  let savedFeeds = [];
  let officialLists = [];

  $: updateBookmark($bookmarks);
  $: updateList($userLists);

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

  async function handleFeedsClose() {
      await updateFeeds();
  }

  async function updateFeeds() {
      savedFeeds = await _agent.getSavedFeeds();
      feedColumns = [];

      savedFeeds.forEach(feed => {
          feedColumns = [...feedColumns, {
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
          }]
      });
  }

  async function updateLists() {
      const res = await _agent.agent.api.app.bsky.graph.getLists({actor: _agent.did(), limit: 100, cursor: ''});
      officialLists = res.data.lists;
      officialListColumns = [];

      console.log(officialLists);

      officialLists.forEach(list => {
          officialListColumns = [...officialListColumns, {
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
          }]
      })
  }

  onMount(async () => {
      await Promise.all([updateLists(), updateFeeds()]);
  })
</script>

<div class="column-adder-group">
    <p class="column-adder-group__title">{$_('basic_columns')}</p>
    <ColumnListAdder {_agent} items={basicColumns} on:add></ColumnListAdder>
</div>

{#if (bookmarkColumns.length)}
    <div class="column-adder-group">
        <p class="column-adder-group__title">{$_('bookmark_columns')}</p>
        <ColumnListAdder {_agent} items={bookmarkColumns} on:add></ColumnListAdder>
    </div>
{/if}

{#if (localListColumns.length)}
    <div class="column-adder-group">
        <p class="column-adder-group__title">{$_('local_list_columns')}</p>
        <ColumnListAdder {_agent} items={localListColumns} on:add></ColumnListAdder>
    </div>
{/if}

{#if (officialListColumns.length)}
    <div class="column-adder-group">
        <p class="column-adder-group__title">{$_('official_list_columns')}</p>
        <ColumnListAdder {_agent} items={officialListColumns} on:add></ColumnListAdder>
    </div>
{/if}

{#if (feedColumns.length)}
    <div class="column-adder-group">
        <p class="column-adder-group__title">{$_('feed_columns')}</p>
        <ColumnListAdder {_agent} items={feedColumns} on:add></ColumnListAdder>
    </div>
{/if}

<FeedsObserver on:close={handleFeedsClose} {_agent}></FeedsObserver>

<style lang="postcss">
    .column-adder-group {
        margin-bottom: 16px;

        &__title {
            font-weight: bold;
            margin-bottom: 8px;
            font-size: 14px;
            letter-spacing: .025em;
        }
    }
</style>