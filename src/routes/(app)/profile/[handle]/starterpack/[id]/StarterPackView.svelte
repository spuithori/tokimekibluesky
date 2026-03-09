<script lang="ts">
  import {_} from "svelte-i18n";
  import {agent, starterPackModal} from "$lib/stores";
  import {isDid} from "$lib/util";
  import UserItem from "../../UserItem.svelte";
  import FeedsItem from "$lib/components/feeds/FeedsItem.svelte";
  import {toast} from "svelte-sonner";
  import {TID} from "$lib/atproto-tid";
  import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
  import DeckRow from "../../../../DeckRow.svelte";
  import {getColumnState} from "$lib/classes/columnState.svelte";
  import StarterPackMenu from "$lib/components/starterpack/StarterPackMenu.svelte";
  import StarterPackObserver from "$lib/components/starterpack/StarterPackObserver.svelte";
  import Infinite from "$lib/components/utils/Infinite.svelte";

  interface Props {
    id: string;
    handle: string;
    title?: string;
  }

  let {
    id,
    handle,
    title = $bindable(''),
  }: Props = $props();

  const columnState = getColumnState(true);

  const columnId = 'starterpack_' + id;
  const existingColumn = columnState.hasColumn(columnId)
    ? columnState.getColumn(columnState.getColumnIndex(columnId))
    : null;

  let starterPack = $state(existingColumn?.data?.starterPackCache || undefined);
  let did = $state('');
  let isFollowingAll = $state(false);
  let isFollowingProgress = $state(false);
  let isOwner = $state(starterPack?.creator?.did === $agent.did());
  let existingMembers = $state([]);
  let members = $state([]);
  let membersCursor = $state('');
  let listUri = $state('');
  let activeTab: 'members' | 'posts' = $state(existingColumn?.data?.activeTab || 'members');

  if (starterPack) {
    title = starterPack.record?.name || '';
  }

  function setActiveTab(tab: 'members' | 'posts') {
    activeTab = tab;
    const idx = columnState.getColumnIndex(columnId);
    if (idx >= 0) {
      const col = columnState.getColumn(idx);
      if (col?.data) col.data.activeTab = tab;
    }
  }

  if (isDid(handle)) {
    did = handle;
    fetchStarterPack();
  } else {
    $agent.xrpc.get('com.atproto.identity.resolveHandle', {handle: handle})
      .then(value => {
        did = value.did;
        fetchStarterPack();
      })
      .catch(e => {
        console.error(e);
      });
  }

  async function fetchStarterPack() {
    try {
      const atUri = `at://${did}/app.bsky.graph.starterpack/${id}`;
      const res = await $agent.xrpc.get('app.bsky.graph.getStarterPack', {starterPack: atUri});
      starterPack = res.starterPack;
      title = starterPack.record?.name || '';

      isOwner = starterPack.creator?.did === $agent.did();

      if (isOwner) {
        try {
          existingMembers = await getExistingListItemUris(starterPack.record?.list || starterPack.list?.uri);
        } catch (e) {
          console.error(e);
        }
      }

      listUri = starterPack.record?.list || starterPack.list?.uri;

      if (listUri) {
        try {
          const listRes = await $agent.xrpc.get('app.bsky.graph.getList', {list: listUri, limit: 30});
          members = listRes.items.map(item => item.subject);
          membersCursor = listRes.cursor || '';
        } catch (e) {
          console.error(e);
        }
      }

      if (listUri && !columnState.hasColumn(columnId)) {
        columnState.add({
          id: columnId,
          algorithm: {
            algorithm: listUri,
            type: 'officialList',
            name: '',
          },
          style: 'default',
          settings: defaultDeckSettings,
          did: $agent.did(),
          handle: $agent.handle(),
          data: {
            feed: [],
            cursor: '',
          }
        });
      }

      const col = columnState.getColumn(columnState.getColumnIndex(columnId));
      if (col?.data) col.data.starterPackCache = starterPack;
    } catch (e) {
      console.error(e);
    }
  }

  async function followAll() {
    if (isFollowingProgress) return;
    isFollowingProgress = true;

    try {
      const members = starterPack?.list?.items || starterPack?.listItemsSample || [];
      const dids = members
        .filter(m => m.subject?.did !== $agent.did() && !m.subject?.viewer?.following && !m.subject?.viewer?.blocking && !m.subject?.viewer?.blockedBy && !m.subject?.viewer?.muted)
        .map(m => m.subject.did);

      const via = starterPack.cid ? { uri: starterPack.uri, cid: starterPack.cid } : undefined;
      let tid = TID.now();

      const writes = dids.map(targetDid => {
        tid = TID.next(tid);
        return {
          $type: 'com.atproto.repo.applyWrites#create',
          collection: 'app.bsky.graph.follow',
          rkey: tid.toString(),
          value: {
            $type: 'app.bsky.graph.follow',
            subject: targetDid,
            createdAt: new Date().toISOString(),
            ...(via ? { via } : {}),
          },
        };
      });

      for (let i = 0; i < writes.length; i += 50) {
        await $agent.xrpc.post('com.atproto.repo.applyWrites', {
          repo: $agent.did(),
          writes: writes.slice(i, i + 50),
        });
      }

      isFollowingAll = true;
    } catch (e) {
      console.error(e);
      toast.error('Failed to follow all');
    }

    isFollowingProgress = false;
  }

  async function getExistingListItemUris(listUri) {
    let items = [];
    for (let cursor; cursor !== null;) {
      const res = await $agent.xrpc.get('com.atproto.repo.listRecords', {
        collection: 'app.bsky.graph.listitem',
        repo: $agent.did(),
        cursor: cursor,
        limit: 100,
      });
      res.records.forEach(record => {
        if (record.value?.list === listUri) {
          items = [...items, { uri: record.uri, did: record.value.subject }];
        }
      });
      cursor = res?.cursor || null;
    }
    return items;
  }

  async function handleLoadMoreMembers(loaded, complete) {
    if (!listUri || !membersCursor) {
      complete();
      return;
    }

    try {
      const res = await $agent.xrpc.get('app.bsky.graph.getList', {list: listUri, limit: 30, cursor: membersCursor});
      const newMembers = res.items.map(item => item.subject);
      members = [...new Map([...members, ...newMembers].map(m => [m.did, m])).values()];
      membersCursor = res.cursor || '';

      if (membersCursor) {
        loaded();
      } else {
        complete();
      }
    } catch (e) {
      console.error(e);
      complete();
    }
  }

  function handleEdit() {
    $starterPackModal = { open: true, uri: starterPack.uri };
  }

  function handleMenuClose() {
    history.back();
  }

  async function handleObserverClose() {
    try {
      const atUri = `at://${did}/app.bsky.graph.starterpack/${id}`;
      const res = await $agent.xrpc.get('app.bsky.graph.getStarterPack', {starterPack: atUri});
      starterPack = res.starterPack;
      title = starterPack.record?.name || '';

      const col = columnState.getColumn(columnState.getColumnIndex(columnId));
      if (col?.data) col.data.starterPackCache = starterPack;

      listUri = starterPack.record?.list || starterPack.list?.uri;
      if (listUri) {
        const listRes = await $agent.xrpc.get('app.bsky.graph.getList', {list: listUri, limit: 30});
        members = listRes.items.map(item => item.subject);
        membersCursor = listRes.cursor || '';
      }

      if (isOwner) {
        existingMembers = await getExistingListItemUris(starterPack.record?.list || starterPack.list?.uri);
      }
    } catch (e) {
      console.error(e);
    }
  }
</script>

{#if starterPack}
  <div class="starter-pack-view">
    <div class="starter-pack-view__header">
      <h2 class="starter-pack-view__title">{starterPack.record?.name || ''}</h2>

      {#if starterPack.record?.description}
        <p class="starter-pack-view__description">{starterPack.record.description}</p>
      {/if}

      <div class="starter-pack-view__meta">
        {#if starterPack.joinedAllTimeCount}
          <span class="starter-pack-view__stat">{$_('starter_pack_joined_count', { values: { count: starterPack.joinedAllTimeCount }})}</span>
        {/if}

        {#if starterPack.listItemCount != null}
          <span class="starter-pack-view__stat">{$_('starter_pack_members_count', { values: { count: starterPack.listItemCount }})}</span>
        {/if}
      </div>

      <div class="starter-pack-view__actions">
        <button class="button button--sm" onclick={followAll} disabled={isFollowingAll || isFollowingProgress}>
          {#if isFollowingProgress}
            ...
          {:else if isFollowingAll}
            {$_('starter_pack_follow_all')} ✓
          {:else}
            {$_('starter_pack_follow_all')}
          {/if}
        </button>

        {#if isOwner}
          <button class="button button--sm button--border" onclick={handleEdit}>
            {$_('starter_pack_edit')}
          </button>
        {/if}
      </div>

      <StarterPackMenu uri={starterPack.uri} cid={starterPack.cid || ''} listUri={starterPack.record?.list || starterPack.list?.uri || ''} {existingMembers} {isOwner} onclose={handleMenuClose}></StarterPackMenu>
    </div>

    <ul class="profile-tab">
      <li class="profile-tab__item" class:profile-tab__item--active={activeTab === 'members'}>
        <button onclick={() => { setActiveTab('members') }}>{$_('official_list_member')}</button>
      </li>
      <li class="profile-tab__item" class:profile-tab__item--active={activeTab === 'posts'}>
        <button onclick={() => { setActiveTab('posts') }}>{$_('posts')}</button>
      </li>
    </ul>

    {#if activeTab === 'members'}
      {#if members.length}
        <div class="starter-pack-view__section">
          <div class="starter-pack-view__members">
            {#each members as member (member.did)}
              <UserItem user={member}></UserItem>
            {/each}

            <Infinite oninfinite={handleLoadMoreMembers}></Infinite>
          </div>
        </div>
      {/if}

      {#if starterPack.feeds?.length}
        <div class="starter-pack-view__section">
          <h3 class="starter-pack-view__section-title">{$_('feeds')}</h3>
          <div class="starter-pack-view__feeds">
            {#each starterPack.feeds as feed}
              <FeedsItem {feed} layout="default"></FeedsItem>
            {/each}
          </div>
        </div>
      {/if}
    {/if}
  </div>
{/if}

{#if activeTab === 'posts' && columnState.hasColumn(columnId)}
  <DeckRow index={columnState.getColumnIndex(columnId)} isJunk={true} name={title}></DeckRow>
{/if}

<StarterPackObserver onclose={handleObserverClose}></StarterPackObserver>

<style lang="postcss">
  .starter-pack-view {
    &__header {
      padding: 16px;
      border-bottom: 1px solid var(--border-color-2);
      position: relative;
    }

    &__title {
      font-size: 20px;
      color: var(--text-color-1);

      @media (max-width: 767px) {
        font-size: 18px;
      }
    }

    &__description {
      font-size: 14px;
      color: var(--text-color-2);
      margin-top: 8px;
      white-space: pre-wrap;
    }

    &__meta {
      margin-top: 12px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 13px;
      color: var(--text-color-3);
    }

    &__creator {
      font-weight: 500;
      color: var(--text-color-2);
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }

    &__stat {
      &::before {
        content: '·';
        margin-right: 8px;
      }

      &:first-child::before {
        content: none;
      }
    }

    &__actions {
      margin-top: 16px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    &__section {
      padding: 16px;
      border-bottom: 1px solid var(--border-color-2);
    }

    &__section-title {
      font-size: 16px;
      color: var(--text-color-1);
      margin-bottom: 12px;
    }

    &__members {
      display: flex;
      flex-direction: column;
    }

    &__feeds {
      display: flex;
      flex-direction: column;
    }
  }
</style>
