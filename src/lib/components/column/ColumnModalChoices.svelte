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

  let allColumns = [
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
      },
  ];

  if (_agent.agent.service.host === 'bsky.social') {
      allColumns = [...allColumns, {
          id: self.crypto.randomUUID(),
          algorithm: {
              type: 'realtime',
              name: 'REALTIME',
              algorithm: 'following'
          },
          style: 'default',
          settings: defaultDeckSettings,
          did: _agent.did(),
          handle: _agent.handle(),
      },]
  }

  allColumns = [...allColumns, {
      id: self.crypto.randomUUID(),
      algorithm: {
          type: 'notification',
          name: $_('notifications'),
      },
      style: 'default',
      settings: defaultDeckSettings,
      did: _agent.did(),
      handle: _agent.handle(),
  }];

  let savedFeeds = [];

  $: updateBookmark($bookmarks);
  $: updateList($userLists);

  function updateBookmark(bookmarks) {
      if (!bookmarks) {
          return false;
      }

      allColumns = allColumns.filter(column => column.algorithm.type !== 'bookmark');

      bookmarks.forEach(bookmark => {
          if (bookmark.owner === _agent.did()) {
              allColumns = [...allColumns, {
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
              }]
          }
      });
  }

  function updateList(lists) {
      if (!lists) {
          return false;
      }

      allColumns = allColumns.filter(column => column.algorithm.type !== 'list');

      lists.forEach(list => {
          if (list.owner === _agent.did()) {
              allColumns = [...allColumns, {
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
              }]
          }
      });
  }

  async function handleFeedsClose() {
      await updateFeeds();
  }

  async function updateFeeds() {
      savedFeeds = await _agent.getSavedFeeds();

      if (allColumns.length) {
          allColumns = allColumns.filter(column => column.algorithm.type !== 'custom');
      }

      savedFeeds.forEach(feed => {
          allColumns = [...allColumns, {
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
          }]
      });
  }

  onMount(async () => {
      await updateFeeds();
  })
</script>

<ColumnListAdder items={allColumns} on:add></ColumnListAdder>
<FeedsObserver on:close={handleFeedsClose} {_agent}></FeedsObserver>