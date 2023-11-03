<script lang="ts">
  import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
  import {agent, bookmarkModal, listModal, officialListModal, userLists} from "$lib/stores";
  import {_} from "svelte-i18n";
  import {liveQuery} from "dexie";
  import {db} from "$lib/db";
  import {onMount} from "svelte";
  import ColumnListAdder from "$lib/components/column/ColumnListAdder.svelte";

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
    <div class="column-adder-group__heading">
        <p class="column-adder-group__title">{$_('basic_columns')}</p>
    </div>

    <ColumnListAdder {_agent} items={basicColumns} on:add></ColumnListAdder>
</div>


<div class="column-adder-group">
    <div class="column-adder-group__heading">
        <p class="column-adder-group__title">{$_('bookmark_columns')}</p>

        <button class="column-adder-group__add" on:click={() => {bookmarkModal.set({open: true, data: undefined})}}>{$_('new_create')}</button>
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

        <button class="column-adder-group__add" on:click={() => {listModal.set({open: true, data: undefined })}}>{$_('new_create')}</button>
    </div>

    {#if (localListColumns.length)}
        <ColumnListAdder {_agent} items={localListColumns} on:add></ColumnListAdder>
    {:else}
        <p class="column-adder-text">{$_('there_is_no_local_list')}</p>
    {/if}
</div>

<div class="column-adder-group">
    <div class="column-adder-group__heading">
        <p class="column-adder-group__title">{$_('official_list_columns')}</p>

        <button class="column-adder-group__add" on:click={() => {$officialListModal.open = true}}>{$_('new_create')}</button>
    </div>

    {#if (officialListColumns.length)}
        <ColumnListAdder {_agent} items={officialListColumns} on:add></ColumnListAdder>
    {:else}
        <p class="column-adder-text">{$_('there_is_no_official_list')}</p>
    {/if}
</div>


{#if (feedColumns.length)}
    <div class="column-adder-group">
        <div class="column-adder-group__heading">
            <p class="column-adder-group__title">{$_('feed_columns')}</p>
        </div>

        <ColumnListAdder {_agent} items={feedColumns} on:add></ColumnListAdder>
    </div>
{/if}

<style lang="postcss">
    .column-adder-group {
        margin-bottom: 24px;

        &__heading {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            margin-bottom: 8px;
            font-size: 14px;
            letter-spacing: .025em;
        }

        &__title {

        }

        &__add {
            color: var(--primary-color);

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