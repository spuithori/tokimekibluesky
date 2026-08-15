<script lang="ts">
    import {agent} from '$lib/stores';
    import {onDestroy, onMount} from "svelte";
    import {createDebouncedSearch} from "$lib/typeaheadSearch";
    import type {ProfileView, ProfileViewBasic} from "$lib/types/atproto";
    import ListMember from "./ListMember.svelte";
    import { toast } from "svelte-sonner";
    import {_} from "tokimeki-i18n";
    import Modal from "$lib/components/ui/Modal.svelte";
    import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
    import CloudListMenu from "$lib/components/list/CloudListMenu.svelte";

    let { _agent = $agent, id, close } = $props();
    let name = $state('');
    let text = $state('');
    let members = $state<ProfileView[]>([]);
    let search = $state('');
    let searchMembers = $state<ProfileViewBasic[]>([]);
    let loading = $state(false);
    let saving = $state(false);
    let exportText = $state('');
    let importText = $state('');

    async function hydrateProfiles(dids: string[]): Promise<ProfileView[]> {
        if (!dids.length) {
            return [];
        }

        const chunks: string[][] = [];
        for (let i = 0; i < dids.length; i += 25) {
            chunks.push(dids.slice(i, i + 25));
        }

        const results = await Promise.all(chunks.map(chunk => _agent.xrpc.get('app.bsky.actor.getProfiles', {actors: chunk})));
        return results.flatMap(res => res.profiles);
    }

    function refreshExportText() {
        exportText = JSON.stringify(members.map(member => member.did));
    }

    onMount(async () => {
        if (id) {
            loading = true;

            try {
                const result = await _agent.getCloudList(id);

                if (result?.list) {
                    name = result.list.name;
                    text = result.list?.text || '';
                }

                members = await hydrateProfiles(result?.members || []);
                refreshExportText();
                loading = false;
            } catch (e) {
                console.error(e);
                close(false);
            }
        } else {
            refreshExportText();
        }
    })

    const memberSearch = createDebouncedSearch(
        (term, signal) => _agent.xrpc.get('app.bsky.actor.searchActorsTypeahead', {term, limit: 10}, {signal}),
        {
            onResult: (res) => { searchMembers = res.actors; },
            onClear: () => { searchMembers = []; },
        },
    );

    function handleKeyDown() {
        memberSearch.run(search);
    }

    onDestroy(() => {
        memberSearch.cancel();
    });

    function handleDelete(deletedMember: ProfileView) {
        members = members.filter(member => member.did !== deletedMember.did);
        refreshExportText();
    }

    function handleAdd(member: ProfileViewBasic) {
        if (!members.find(m => m.did === member.did)) {
            members = [...members, member as ProfileView];
        }
        refreshExportText();
    }

    async function save() {
        if (saving) {
            return false;
        }

        saving = true;

        try {
            await _agent.addCloudList({
                id: id || undefined,
                name: name,
                text: text,
                members: members.map(member => member.did),
            });

            toast.success($_('cloud_list_save_success'));
            close(false);
        } catch (e) {
            toast.error('Error: ' + e);
        } finally {
            saving = false;
        }
    }

    function cancel() {
        close(false);
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
            members = await hydrateProfiles(importObj);
            refreshExportText();

            toast.success($_('success_import_list'));
        } catch(e) {
            toast.error($_('error_invalid_text'));
        }
    }
</script>

<Modal title={$_('cloud_list_add_management')} onclose={cancel}>
  {#if (loading)}
    <LoadingSpinner></LoadingSpinner>
  {:else}
    <p class="modal-description">{$_('cloud_list_add_description')}<br>
      <a href="https://docs.tokimeki.blue/privacy" target="_blank" rel="noopener">{$_('privacy_policy')}</a></p>

    <div class="list-modal-column">
      <div class="list-modal-row">
        <dl class="list-modal-group list-modal-group--name">
          <dt class="list-modal-group__name">
            <label for="cloudListName">{$_('list_name')}</label>
          </dt>

          <dd class="list-modal-group__content">
            <div class="list-modal-name">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
                <path id="edit-pencil" d="M9.84,2.96l3.2,3.2L3.2,16H0V12.8Zm1.12-1.12L12.8,0,16,3.2,14.16,5.04Z" fill="var(--text-color-1)"/>
              </svg>

              <input id="cloudListName" type="text" class="list-modal-name__input" bind:value={name}>
            </div>
          </dd>
        </dl>

        <dl class="list-modal-group list-modal-group--name">
          <dt class="list-modal-group__name">
            <label for="cloudListDescription">{$_('bookmark_description')}</label>
          </dt>

          <dd class="list-modal-group__content">
            <div class="list-modal-name">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
                <path id="edit-pencil" d="M9.84,2.96l3.2,3.2L3.2,16H0V12.8Zm1.12-1.12L12.8,0,16,3.2,14.16,5.04Z" fill="var(--text-color-1)"/>
              </svg>

              <input id="cloudListDescription" type="text" class="list-modal-name__input" bind:value={text}>
            </div>
          </dd>
        </dl>

        <dl class="list-modal-group">
          <dt class="list-modal-group__name">
            {$_('list_member')}
          </dt>

          <dd class="list-modal-group__content">
            <div class="list-modal-members">
              {#each members as member (member.did)}
                <ListMember member={member} action="delete" ondelete={handleDelete}></ListMember>
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
                <input type="text" class="list-modal-search-input" bind:value={search} onkeydown={handleKeyDown} placeholder="{$_('handle_or_name')}">
              </div>

              {#each searchMembers as member (member.did)}
                {#if (!members.find(m => m.did === member.did))}
                  <ListMember member={member} action="add" onadd={handleAdd}></ListMember>
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
              <button class="button button--sm" onclick={exporting} aria-label={$_('export_clipboard_copy')}><svg xmlns="http://www.w3.org/2000/svg" width="14.417" height="18" viewBox="0 0 14.417 18">
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
              <button class="button button--sm" onclick={importing}>{$_('import')}</button>
            </div>
          </dd>
        </dl>
      </div>
    </details>

    <div class="list-modal-close">
      <button class="button button--sm" onclick={save} disabled={saving}>{$_('save_button')}</button>
      <button class="button button--sm button--border button--danger" onclick={cancel}>{$_('cancel')}</button>
    </div>

    <CloudListMenu {id} {_agent} {close}></CloudListMenu>
  {/if}
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
