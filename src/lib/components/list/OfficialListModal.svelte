<script lang="ts">
    import {agent} from '$lib/stores';
    import {onMount} from "svelte";
    import ListMember from "./ListMember.svelte";
    import {createEventDispatcher} from 'svelte';
    import toast from "svelte-french-toast";
    import {_} from "svelte-i18n";
    import spinner from "$lib/images/loading.svg";
    import OfficialListMenu from "$lib/components/list/OfficialListMenu.svelte";
    const dispatch = createEventDispatcher();

    export let _agent = $agent;
    export let purpose = 'app.bsky.graph.defs#curatelist';
    let isDisabled = false;
    export let uri = '';
    let name = 'new list';
    let members = [];
    let existingMembers = [];
    let search = '';
    let searchMembers = [];
    let timer;
    let ready = false;
    let exportText;
    let importText = '';

    onMount(async () => {
        isDisabled = true;

        try {
            if (uri) {
                const res = await _agent.agent.api.app.bsky.graph.getList({list: uri, limit: 100});
                const items = res.data.items;
                name = res.data.list.name;

                members = items.map(item => {
                    return item.subject;
                })

                existingMembers = await getExistingListItemUris(uri);
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

    async function getExistingListItemUris(uri) {
        let items = [];

        for (let cursor; cursor !== null;) {
            const res = await _agent.agent.api.com.atproto.repo.listRecords({
                collection: 'app.bsky.graph.listitem',
                repo: _agent.did(),
                cursor: cursor,
                limit: 100,
            })

            res.data.records.forEach(record => {
                if (record.value?.list === uri) {
                    items = [...items, {
                        uri: record.uri,
                        did: record.value.subject,
                    }]
                }

            });
            cursor = res.data?.cursor || null;
        }

        return items;
    }

    function handleListChange() {
        exportText = JSON.stringify(members.map(member => member.did));
    }

    async function handleKeyDown() {
        clearTimeout(timer);
        timer = setTimeout(async () => {
            const res = await _agent.agent.api.app.bsky.actor.searchActorsTypeahead({term: search, limit: 10})
            searchMembers = res.data.actors;
        }, 250)
    }

    function handleDelete(event) {
        members = members.filter(member => {
            return member.did !== event.detail.member.did;
        });
        members = members.filter(v => v);
        // handleListChange();
    }

    function handleAdd(event) {
        members = [...members, event.detail.member];
        // handleListChange();
    }

    async function createList() {
        try {
            const list = await _agent.agent.api.app.bsky.graph.list.create(
                {
                    repo: _agent.did()
                },
                {
                    name: name,
                    purpose: purpose,
                    createdAt: new Date().toISOString(),
                })
            return list.uri;
        } catch (e) {
            isDisabled = false;
            toast.error(e.message);
            console.error(e);
        }
    }

    async function save() {
        isDisabled = true;

        try {
            const listUri = uri || await createList();

            if (!listUri) {
                return false;
            }

            if (uri) {
                const rkey = uri.split('/').slice(-1)[0];

                await _agent.agent.api.com.atproto.repo.putRecord(
                    {
                        repo: _agent.did(),
                        rkey: rkey,
                        collection: 'app.bsky.graph.list',
                        record: {
                            name: name,
                            purpose: purpose,
                            createdAt: new Date().toISOString(),
                        },
                    }
                )
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
                            list: listUri,
                            createdAt: new Date().toISOString(),
                        }
                    }]
                }
            });

            if (writes.length) {
                console.log(writes);
                const res = await _agent.agent.com.atproto.repo.applyWrites({
                    repo: _agent.did() as string,
                    writes: writes,
                });
            }

            isDisabled = false;
            dispatch('close');
        } catch(e) {
            isDisabled = false;
            console.error(e);
            toast.error(e.message());
        }
    }

    function remove() {
        dispatch('close');
    }

    function exporting() {
        navigator.clipboard.writeText(exportText)
            .then(() => {
                toast.success($_('success_export_list'));
            }, () => {
                toast.success($_('failed_copy'));
            });
    }

    async function importing() {
        try {
            const importObj = JSON.parse(importText);
            const res = await _agent.agent.api.app.bsky.actor.getProfiles({actors: importObj});
            members = res.data.profiles;

            // handleListChange();

            toast.success($_('success_import_list'));
        } catch(e) {
            toast.error($_('error_invalid_text'));
        }
    }
</script>

<div class="modal">
  <div class="modal-contents">
    {#if uri}
      <h2 class="modal-title">{$_(purpose === 'app.bsky.graph.defs#curatelist' ? 'official_list_edit' : 'mod_list_edit')}</h2>
    {:else}
      <h2 class="modal-title">{$_(purpose === 'app.bsky.graph.defs#curatelist' ? 'official_list_add_management' : 'mod_list_add_management')}</h2>
    {/if}
    <p class="modal-description">{$_('official_list_add_description')}</p>

    {#if ready}
      <div class="list-modal-column">
        <div class="list-modal-row">
          <dl class="list-modal-group list-modal-group--name">
            <dt class="list-modal-group__name">
              <label for="listName">{$_('list_name')}</label>
            </dt>

            <dd class="list-modal-group__content">
              <div class="list-modal-name">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
                  <path id="edit-pencil" d="M9.84,2.96l3.2,3.2L3.2,16H0V12.8Zm1.12-1.12L12.8,0,16,3.2,14.16,5.04Z" fill="var(--text-color-1)"/>
                </svg>

                <input id="listName" type="text" class="list-modal-name__input" bind:value={name}>
              </div>
            </dd>
          </dl>

          <dl class="list-modal-group">
            <dt class="list-modal-group__name">
              {$_('official_list_member')}
            </dt>

            <dd class="list-modal-group__content">
              <div class="list-modal-members">
                {#each members as member}
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
                  <input type="text" class="list-modal-search-input" bind:value={search} on:keydown={handleKeyDown} placeholder="{$_('handle_or_name')}">
                </div>

                {#each searchMembers as member}
                  {#if (!members.find(m => m.did === member.did))}
                    <ListMember member={member} action={'add'} on:add={handleAdd}></ListMember>
                  {/if}
                {/each}
              </div>
            </dd>
          </dl>
        </div>
      </div>

      <OfficialListMenu {_agent} {uri} {existingMembers} on:close></OfficialListMenu>
    {:else}
      <div class="thread-loading">
        <img src={spinner} alt="">
      </div>
    {/if}

    <div class="list-modal-close">
      <button class="button button--sm" on:click={save} disabled={isDisabled}>{$_('save_button')}</button>
      <button class="button button--sm button--border button--danger" on:click={remove}>{$_('cancel')}</button>
    </div>
  </div>
</div>

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
</style>
