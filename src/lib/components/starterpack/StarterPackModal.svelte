<script lang="ts">
    import {agent} from '$lib/stores';
    import {onMount} from "svelte";
    import ListMember from "$lib/components/list/ListMember.svelte";
    import { toast } from "svelte-sonner";
    import {_} from "svelte-i18n";
    import Modal from "$lib/components/ui/Modal.svelte";
    import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";

    let isDisabled = $state(false);
    interface Props {
      _agent?: any;
      uri?: string;
    }

    let { _agent = $agent, uri = $bindable(''), onclose }: Props = $props();
    const MAX_NAME_LENGTH = 50;
    const MIN_MEMBERS = 8;
    const MAX_MEMBERS = 150;
    const MAX_FEEDS = 3;

    let name = $state('');
    let description = $state('');
    let members = $state([]);
    let existingMembers = $state([]);
    let feeds = $state([]);
    let search = $state('');
    let feedSearch = $state('');
    let searchMembers = $state([]);
    let searchFeeds = $state([]);
    let timer;
    let feedTimer;
    let ready = $state(false);
    let listUri = $state('');

    onMount(async () => {
        isDisabled = true;

        try {
            if (uri) {
                const res = await _agent.xrpc.get('app.bsky.graph.getStarterPack', {starterPack: uri});
                const sp = res.starterPack;
                name = sp.record?.name || '';
                description = sp.record?.description || '';
                listUri = sp.record?.list || sp.list?.uri || '';

                if (sp.feeds?.length) {
                    feeds = sp.feeds;
                }

                if (listUri) {
                    const listRes = await _agent.xrpc.get('app.bsky.graph.getList', {list: listUri, limit: 100});
                    members = listRes.items.map(item => item.subject);
                    existingMembers = await getExistingListItemUris(listUri);
                }
            }
        } catch (e) {
            console.error(e);
            toast.error(e);
            uri = '';
            members = [];
        }

        isDisabled = false;
        ready = true;
    })

    async function getExistingListItemUris(listUri) {
        let items = [];

        for (let cursor; cursor !== null;) {
            const res = await _agent.xrpc.get('com.atproto.repo.listRecords', {
                collection: 'app.bsky.graph.listitem',
                repo: _agent.did(),
                cursor: cursor,
                limit: 100,
            })

            res.records.forEach(record => {
                if (record.value?.list === listUri) {
                    items = [...items, {
                        uri: record.uri,
                        did: record.value.subject,
                    }]
                }
            });
            cursor = res?.cursor || null;
        }

        return items;
    }

    async function handleKeyDown() {
        clearTimeout(timer);
        timer = setTimeout(async () => {
            const res = await _agent.xrpc.get('app.bsky.actor.searchActorsTypeahead', {term: search, limit: 10})
            searchMembers = res.actors;
        }, 250)
    }

    async function handleFeedKeyDown() {
        clearTimeout(feedTimer);
        feedTimer = setTimeout(async () => {
            if (!feedSearch.trim()) {
                searchFeeds = [];
                return;
            }
            const res = await _agent.xrpc.get('app.bsky.unspecced.getPopularFeedGenerators', {query: feedSearch, limit: 10});
            searchFeeds = res.feeds;
        }, 250)
    }

    function handleDelete(event) {
        members = members.filter(member => member.did !== event.detail.member.did);
    }

    function handleAdd(event) {
        if (members.length >= MAX_MEMBERS) {
            toast.error($_('starter_pack_members_max', { values: { max: MAX_MEMBERS } }));
            return;
        }
        members = [...members, event.detail.member];
    }

    function addFeed(feed) {
        if (feeds.length >= MAX_FEEDS) {
            toast.error($_('starter_pack_feeds_max', { values: { max: MAX_FEEDS } }));
            return;
        }
        if (!feeds.some(f => f.uri === feed.uri)) {
            feeds = [...feeds, feed];
        }
    }

    function removeFeed(feedUri) {
        feeds = feeds.filter(f => f.uri !== feedUri);
    }

    async function createList() {
        try {
            const list = await _agent.xrpc.post('com.atproto.repo.createRecord', {
                repo: _agent.did(),
                collection: 'app.bsky.graph.list',
                record: {
                    $type: 'app.bsky.graph.list',
                    name: name,
                    purpose: 'app.bsky.graph.defs#curatelist',
                    createdAt: new Date().toISOString(),
                },
            })
            return list.uri;
        } catch (e) {
            isDisabled = false;
            toast.error(e.message);
            console.error(e);
        }
    }

    async function save() {
        if (!name.trim()) {
            toast.error('Name is required');
            return;
        }

        if (members.length < MIN_MEMBERS) {
            toast.error($_('starter_pack_members_min', { values: { min: MIN_MEMBERS } }));
            return;
        }

        isDisabled = true;

        try {
            const currentListUri = listUri || await createList();

            if (!currentListUri) {
                return false;
            }

            if (listUri) {
                const rkey = listUri.split('/').slice(-1)[0];
                await _agent.xrpc.post('com.atproto.repo.putRecord', {
                    repo: _agent.did(),
                    rkey: rkey,
                    collection: 'app.bsky.graph.list',
                    record: {
                        $type: 'app.bsky.graph.list',
                        name: name,
                        purpose: 'app.bsky.graph.defs#curatelist',
                        createdAt: new Date().toISOString(),
                    },
                });
            }

            let writes = [];

            if (existingMembers.length) {
                existingMembers.forEach(member => {
                    if (!members.some(_member => member.did === _member.did)) {
                        writes = [...writes,  {
                            $type: 'com.atproto.repo.applyWrites#delete',
                            collection: 'app.bsky.graph.listitem',
                            rkey: member.uri.split('/').slice(-1)[0],
                        }]
                    }
                })
            }

            members.forEach(member => {
                if (!existingMembers.some(_member => member.did === _member.did)) {
                    writes = [...writes,  {
                        $type: 'com.atproto.repo.applyWrites#create',
                        collection: 'app.bsky.graph.listitem',
                        value: {
                            subject: member.did,
                            list: currentListUri,
                            createdAt: new Date().toISOString(),
                        }
                    }]
                }
            });

            if (writes.length) {
                await _agent.xrpc.post('com.atproto.repo.applyWrites', {
                    repo: _agent.did() as string,
                    writes: writes,
                });
            }

            const spRecord = {
                name: name,
                description: description || undefined,
                list: currentListUri,
                feeds: feeds.length ? feeds.map(f => ({uri: f.uri})) : undefined,
                createdAt: new Date().toISOString(),
            };

            if (uri) {
                const rkey = uri.split('/').slice(-1)[0];
                await _agent.xrpc.post('com.atproto.repo.putRecord', {
                    repo: _agent.did(),
                    rkey: rkey,
                    collection: 'app.bsky.graph.starterpack',
                    record: { $type: 'app.bsky.graph.starterpack', ...spRecord },
                });
            } else {
                await _agent.xrpc.post('com.atproto.repo.createRecord', {
                    repo: _agent.did(),
                    collection: 'app.bsky.graph.starterpack',
                    record: { $type: 'app.bsky.graph.starterpack', ...spRecord },
                });
            }

            isDisabled = false;
            onclose();
        } catch(e) {
            isDisabled = false;
            console.error(e);
            toast.error(e.message);
        }
    }
</script>

<Modal title={$_(uri ? 'starter_pack_edit' : 'starter_pack_create')} {onclose}>
  {#if ready}
    <div class="list-modal-column">
      <div class="list-modal-row">
        <dl class="list-modal-group list-modal-group--name">
          <dt class="list-modal-group__name">
            <label for="spName">{$_('starter_pack_name')}</label>
          </dt>

          <dd class="list-modal-group__content">
            <div class="list-modal-name">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
                <path id="edit-pencil" d="M9.84,2.96l3.2,3.2L3.2,16H0V12.8Zm1.12-1.12L12.8,0,16,3.2,14.16,5.04Z" fill="var(--text-color-1)"/>
              </svg>

              <input id="spName" type="text" class="list-modal-name__input" bind:value={name} placeholder={$_('starter_pack_name')} maxlength={MAX_NAME_LENGTH}>
              <span class="sp-modal-char-count" class:sp-modal-char-count--warn={name.length >= MAX_NAME_LENGTH}>{name.length}/{MAX_NAME_LENGTH}</span>
            </div>
          </dd>
        </dl>

        <dl class="list-modal-group list-modal-group--name">
          <dt class="list-modal-group__name">
            <label for="spDescription">{$_('description')}</label>
          </dt>

          <dd class="list-modal-group__content">
            <textarea id="spDescription" class="sp-modal-description" bind:value={description} rows="3"></textarea>
          </dd>
        </dl>

        <dl class="list-modal-group">
          <dt class="list-modal-group__name">
            {$_('official_list_member')} <span class="sp-modal-counter" class:sp-modal-counter--warn={members.length < MIN_MEMBERS}>{members.length}/{MAX_MEMBERS}</span>
          </dt>

          <dd class="list-modal-group__content">
            <div class="list-modal-members">
              {#each members as member (member.did)}
                {#if (typeof member !== 'string')}
                  <ListMember member={member} action={'delete'} on:delete={handleDelete}></ListMember>
                {/if}
              {:else}
                <p class="list-modal-members__none">{$_('there_is_no_list_member')}</p>
              {/each}
            </div>
          </dd>
        </dl>
      </div>

      <div class="list-modal-row">
        <dl class="list-modal-group">
          <dt class="list-modal-group__name">
            {$_('user_search')}
          </dt>

          <dd class="list-modal-group__content">
            <div class="list-modal-members">
              <div class="list-modal-search">
                <svg xmlns="http://www.w3.org/2000/svg" width="17.67" height="17.661" viewBox="0 0 17.67 17.661">
                  <path id="search" d="M11.589,12.866A7.187,7.187,0,1,1,12.856,11.6l4.807,4.789-1.276,1.276-4.789-4.8Zm-4.4-.287A5.391,5.391,0,1,0,1.8,7.188a5.391,5.391,0,0,0,5.391,5.391Z" transform="translate(0.008 -0.002)" fill="var(--primary-color)"/>
                </svg>
                <input type="text" class="list-modal-search-input" bind:value={search} onkeydown={handleKeyDown} placeholder={$_('handle_or_name')}>
              </div>

              {#each searchMembers as member (member.did)}
                {#if (!members.find(m => m.did === member.did))}
                  <ListMember member={member} action={'add'} on:add={handleAdd}></ListMember>
                {/if}
              {/each}
            </div>
          </dd>
        </dl>
      </div>
    </div>

    <div class="sp-modal-feeds-section">
      <dl class="list-modal-group">
        <dt class="list-modal-group__name">
          {$_('starter_pack_add_feed')} <span class="sp-modal-counter">{feeds.length}/{MAX_FEEDS}</span>
        </dt>

        <dd class="list-modal-group__content">
          <div class="list-modal-search">
            <svg xmlns="http://www.w3.org/2000/svg" width="17.67" height="17.661" viewBox="0 0 17.67 17.661">
              <path id="search" d="M11.589,12.866A7.187,7.187,0,1,1,12.856,11.6l4.807,4.789-1.276,1.276-4.789-4.8Zm-4.4-.287A5.391,5.391,0,1,0,1.8,7.188a5.391,5.391,0,0,0,5.391,5.391Z" transform="translate(0.008 -0.002)" fill="var(--primary-color)"/>
            </svg>
            <input type="text" class="list-modal-search-input" bind:value={feedSearch} onkeydown={handleFeedKeyDown} placeholder={$_('starter_pack_feed_search')}>
          </div>

          {#if searchFeeds.length}
            <div class="sp-modal-feed-results">
              {#each searchFeeds as feed (feed.uri)}
                {#if (!feeds.find(f => f.uri === feed.uri))}
                  <div class="sp-modal-feed-result">
                    <div class="sp-modal-feed-info">
                      {#if feed.avatar}
                        <img class="sp-modal-feed-avatar" src={feed.avatar} alt="">
                      {:else}
                        <div class="sp-modal-feed-avatar sp-modal-feed-avatar--empty"></div>
                      {/if}
                      <div>
                        <p class="sp-modal-feed-name">{feed.displayName}</p>
                        <p class="sp-modal-feed-desc">{feed.description?.slice(0, 60) || ''}</p>
                      </div>
                    </div>
                    <button class="button button--ss" onclick={() => addFeed(feed)}>+</button>
                  </div>
                {/if}
              {/each}
            </div>
          {/if}

          {#if feeds.length}
            <div class="sp-modal-feeds-list">
              {#each feeds as feed (feed.uri)}
                <div class="sp-modal-feed-result">
                  <div class="sp-modal-feed-info">
                    {#if feed.avatar}
                      <img class="sp-modal-feed-avatar" src={feed.avatar} alt="">
                    {:else}
                      <div class="sp-modal-feed-avatar sp-modal-feed-avatar--empty"></div>
                    {/if}
                    <div>
                      <p class="sp-modal-feed-name">{feed.displayName}</p>
                    </div>
                  </div>
                  <button class="button button--ss button--danger" onclick={() => removeFeed(feed.uri)} aria-label="Remove feed">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </div>
              {/each}
            </div>
          {/if}
        </dd>
      </dl>
    </div>
  {:else}
    <LoadingSpinner></LoadingSpinner>
  {/if}

  <div class="list-modal-close">
    <button class="button button--sm" onclick={save} disabled={isDisabled}>{$_('save_button')}</button>
    <button class="button button--sm button--border button--danger" onclick={onclose}>{$_('cancel')}</button>
  </div>
</Modal>

<style lang="postcss">
    .list-modal-column {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 30px;

        @media (max-width: 767px) {
            display: block;
        }
    }

    .list-modal-group {
        @media (max-width: 767px) {
            margin-bottom: 20px;
        }

        &__name {
            font-size: 14px;
            margin-bottom: 6px;
        }

        &--name {
            margin-bottom: 30px;

            @media (max-width: 767px) {
                margin-bottom: 20px;
            }
        }
    }

    .list-modal-members {
        border: 1px solid var(--border-color-1);
        border-radius: 6px;
        padding: 20px 16px;

        &__none {
          font-size: 14px;
          white-space: pre-line;
          color: var(--text-color-3);
        }
    }

    .list-modal-name {
        position: relative;
        border: 1px solid var(--border-color-1);
        border-radius: 4px;
        height: 40px;
        padding: 0 10px;
        display: flex;
        gap: 10px;
        align-items: center;
        margin-bottom: 10px;
        overflow: hidden;

        &__input {
            color: var(--text-color-1);
        }

        &:focus-within {
            border-color: var(--text-color-1);
        }

        svg {
            flex-shrink: 0;
        }
    }

    .list-modal-close {
        text-align: center;
        margin-top: 20px;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 20px;
    }

    .list-modal-search {
        position: relative;
        margin-bottom: 20px;

        svg {
            position: absolute;
            left: 10px;
            top: 0;
            bottom: 0;
            margin: auto;
        }
    }

    .list-modal-search-input {
        border: 1px solid var(--border-color-1);
        border-radius: 4px;
        background-color: var(--bg-color-2);
        height: 40px;
        padding: 0 10px 0 40px;
        width: 100%;
        color: var(--text-color-1);
    }

    .sp-modal-description {
        border: 1px solid var(--border-color-1);
        border-radius: 4px;
        padding: 10px;
        width: 100%;
        color: var(--text-color-1);
        background-color: var(--bg-color-2);
        resize: vertical;
        font-family: inherit;
        font-size: 14px;

        &:focus {
            border-color: var(--text-color-1);
            outline: none;
        }
    }

    .sp-modal-feeds-section {
        margin-top: 20px;
        padding-top: 20px;
        border-top: 1px solid var(--border-color-2);
    }

    .sp-modal-feed-results {
        margin-bottom: 16px;
    }

    .sp-modal-feeds-list {
        margin-top: 12px;
    }

    .sp-modal-feed-result {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 0;
        gap: 8px;

        & + & {
            border-top: 1px solid var(--border-color-2);
        }
    }

    .sp-modal-feed-info {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
    }

    .sp-modal-feed-avatar {
        width: 32px;
        height: 32px;
        border-radius: 6px;
        object-fit: cover;
        flex-shrink: 0;

        &--empty {
            background-color: var(--primary-color);
        }
    }

    .sp-modal-feed-name {
        font-size: 14px;
        color: var(--text-color-1);
        font-weight: 500;
    }

    .sp-modal-feed-desc {
        font-size: 12px;
        color: var(--text-color-3);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .sp-modal-char-count {
        font-size: 12px;
        color: var(--text-color-3);
        flex-shrink: 0;

        &--warn {
            color: var(--danger-color);
        }
    }

    .sp-modal-counter {
        font-size: 12px;
        font-weight: normal;
        color: var(--text-color-3);

        &--warn {
            color: var(--danger-color);
        }
    }
</style>
