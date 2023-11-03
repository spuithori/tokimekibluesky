<script lang="ts">
    import {agent, userLists} from '$lib/stores';
    import {onMount} from "svelte";
    import ListMember from "./ListMember.svelte";
    import {createEventDispatcher} from 'svelte';
    import toast from "svelte-french-toast";
    import {_} from "svelte-i18n";
    const dispatch = createEventDispatcher();

    export let _agent = $agent;

    type list = {
        id: string,
        name: string,
        members: string[],
        owner: string,
    }

    let lists: list[] = localStorage.getItem('lists')
        ? JSON.parse(localStorage.getItem('lists'))
        : [];
    export let id = new Date().getTime().toString();
    let name = '';
    let owner = '';
    let members = [];
    let search = '';
    let searchMembers = [];
    let timer;
    let currentIndex = 0;
    let ready = false;
    let exportText;
    let importText = '';

    $: {
        if (ready) {
            handleNameChange(name)
        }
    }

    onMount(async () => {
        const index = lists.findIndex(list => list.id === id);
        if (index !== -1) {
            currentIndex = index;
            members = lists[currentIndex].members;
            name = lists[currentIndex].name;
            owner = lists[currentIndex].owner;
        } else {
            currentIndex = lists.length;
            lists[lists.length] = {
                id: id,
                name: '',
                members: [],
                owner: _agent.did()
            }
        }

        if (members.length) {
            const res = await _agent.agent.api.app.bsky.actor.getProfiles({actors: members})
            members = res.data.profiles;
        }

        exportText = JSON.stringify(members.map(member => member.did))

        ready = true;
    })

    function handleListChange() {
        lists[currentIndex].members = members.map(member => {
            return member.did
        });
        exportText = JSON.stringify(members.map(member => member.did))
        localStorage.setItem('lists', JSON.stringify(lists));
        userLists.set(lists);
    }

    function handleNameChange(name) {
        lists[currentIndex].name = name;
        localStorage.setItem('lists', JSON.stringify(lists));
        userLists.set(lists);
    }

    async function handleKeyDown() {
        clearTimeout(timer);
        timer = setTimeout(async () => {
            const res = await _agent.agent.api.app.bsky.actor.searchActorsTypeahead({term: search, limit: 4})
            searchMembers = res.data.actors;
        }, 250)
    }

    function handleDelete(event) {
        members = members.filter(member => {
            return member.did !== event.detail.member.did;
        });
        members = members.filter(v => v);
        handleListChange();
    }

    function handleAdd(event) {
        members = [...members, event.detail.member];
        handleListChange();
    }

    function close() {
        dispatch('close');
    }

    function remove() {
        dispatch('remove', {
            id: id,
        });
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

            handleListChange();

            toast.success($_('success_import_list'));
        } catch(e) {
            toast.error($_('error_invalid_text'));
        }
    }
</script>

<div class="list-modal">
  <div class="list-modal-contents">
    <h2 class="list-modal-title">{$_('list_add_management')}</h2>
    <p class="modal-description">{$_('list_add_description')}</p>

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
            {$_('list_member')}
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

    <details class="list-modal-accordion list-modal-import-export">
      <summary class="list-modal-accordion__title">{$_('import_export')}</summary>

      <div class="list-modal-accordion__content">
        <dl class="list-modal-group list-modal-export">
          <dt class="list-modal-group__name">
            {$_('export_clipboard_copy')}
          </dt>

          <dd class="list-modal-group__content">
            <div class="list-modal-import-export-group">
              <input type="text" readonly class="list-modal-group__input" bind:value={exportText}>
              <button class="button button--sm" on:click={exporting}><svg xmlns="http://www.w3.org/2000/svg" width="14.417" height="18" viewBox="0 0 14.417 18">
                <path id="clipboard" d="M6.532,2.345a2.7,2.7,0,0,1,5.352,0l1.829.36v.9h.9a1.8,1.8,0,0,1,1.8,1.8V16.221a1.8,1.8,0,0,1-1.8,1.8H3.8a1.8,1.8,0,0,1-1.8-1.8V5.409a1.807,1.807,0,0,1,1.8-1.8h.9v-.9l1.829-.36ZM4.7,5.409H3.8V16.221H14.615V5.409h-.9v.9H4.7Zm4.505-1.8a.9.9,0,1,0-.9-.9A.9.9,0,0,0,9.208,3.606Z" transform="translate(-2 -0.023)" fill="var(--bg-color-1)"/>
              </svg></button>
            </div>
          </dd>
        </dl>

        <dl class="list-modal-group list-modal-import">
          <dt class="list-modal-group__name">
            {$_('import')}<br>
            <span class="text-danger">{$_('overwrite_current_member')}</span>
          </dt>

          <dd class="list-modal-group__content">
            <div class="list-modal-import-export-group">
              <input type="text" class="list-modal-group__input" bind:value={importText}>
              <button class="button button--sm" on:click={importing}>{$_('import')}</button>
            </div>
          </dd>
        </dl>
      </div>
    </details>

    <div class="list-modal-close">
      <button class="button button--sm" on:click={close}>{$_('close_button')}</button>
      <button class="button button--sm button--border button--danger" on:click={remove}>{$_('remove')}</button>
    </div>
  </div>
</div>

<style lang="postcss">
  .list-modal {
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      z-index: 9999;
      background-color: rgba(0, 0, 0, .5);
      overflow: auto;
      padding: 50px 0;

      @media (max-width: 767px) {
          display: block;
          overscroll-behavior-y: none;
          padding: 20px;
      }
  }

  .list-modal-contents {
      padding: 30px;
      border-radius: 10px;
      background-color: var(--bg-color-1);
      width: 740px;
      max-width: 100%;

      @media (max-width: 767px) {
          width: 100%;
      }
  }

  .list-modal-column {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 30px;

      @media (max-width: 767px) {
          display: block;
      }
  }

  .list-modal-title {
      font-weight: 900;
      font-size: 20px;
      line-height: 1.5;
      margin-bottom: 10px;
  }

  .list-modal-group {
      @media (max-width: 767px) {
          margin-bottom: 20px;
      }

      &__name {
          font-size: 14px;
          margin-bottom: 6px;
      }

      &__content {

      }

      &--name {
          margin-bottom: 30px;

          @media (max-width: 767px) {
              margin-bottom: 20px;
          }
      }

      &__input {
          border: 1px solid var(--border-color-1);
          border-radius: 4px;
          height: 40px;
          padding: 0 10px;
          width: 100%;
          background-color: var(--bg-color-2);
          color: var(--text-color-1);
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

  .list-modal-import-export {
      margin-top: 20px;
  }

  .list-modal-accordion {
      border: 1px solid var(--border-color-1);
      border-radius: 4px;
      padding: 10px;

      &__title {
          cursor: pointer;
      }

      &__content {
          margin-top: 20px;
      }
  }

  .list-modal-export {
      margin-bottom: 15px;
  }

  .list-modal-import-export-group {
      display: flex;
      gap: 10px;
  }
</style>
