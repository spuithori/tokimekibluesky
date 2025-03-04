<script lang="ts">
    import {agent} from '$lib/stores';
    import {onMount} from "svelte";
    import { toast } from "svelte-sonner";
    import {_} from "svelte-i18n";
    import OfficialListAddItem from "$lib/components/list/OfficialListAddItem.svelte";
    import Modal from "$lib/components/ui/Modal.svelte";
    import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
    import OfficialListModal from "$lib/components/list/OfficialListModal.svelte";

  let { _agent = $agent, author, onclose } = $props();

    let lists = $state([]);
    let isDisabled = false;
    let ready = $state(false);
    let isModalOpen = $state(false);

    async function applyListItem(lists) {
        let listItems = [];

        for (let cursor; cursor !== null;) {
            const res = await _agent.agent.api.com.atproto.repo.listRecords({
                collection: 'app.bsky.graph.listitem',
                repo: _agent.did(),
                cursor: cursor,
                limit: 100,
            })

            res.data.records.forEach(record => {
                if (record.value?.subject === author.did) {
                    listItems = [...listItems, record]
                }
            });
            cursor = res.data?.cursor || null;
        }

        const _lists = lists.map(list => {
            const item = listItems.find(item => item.value?.list === list.uri);

            if (item) {
                list.listItem = item.uri;
            } else {
                list.listItem = '';
            }

            return list;
        });

        return _lists;
    }

    async function initLists() {
      ready = false;
      isModalOpen = false;
      isDisabled = true;

      try {
        const res = await _agent.agent.api.app.bsky.graph.getLists({actor: _agent.did() as string});

        lists = await applyListItem(res.data.lists);
      } catch (e) {
        console.error(e);
        toast.error(e);
      }

      isDisabled = false;
      ready = true;
    }

    onMount(async () => {
      await initLists();
    })
</script>

<Modal title="{$_('list_instant_manage')}" size="small" {onclose}>
  <p class="list-add-author">{author.displayName || author.handle}</p>

  <div class="list-add-list">
    {#if ready}
      {#each lists as list, index (list)}
        <OfficialListAddItem {list} {_agent} memberDid={author.did}></OfficialListAddItem>
      {/each}

      <div class="list-add-list__new">
        <button class="button button--sm button--with-icon" onclick={() => {isModalOpen = true}}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-plus"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
          {$_('new_create')}
        </button>
      </div>
    {:else}
      <LoadingSpinner></LoadingSpinner>
    {/if}
  </div>
</Modal>

{#if (isModalOpen)}
  <OfficialListModal {_agent} on:close={initLists}></OfficialListModal>
{/if}

<style lang="postcss">
  .list-add-author {
      font-weight: bold;
      margin-bottom: 8px;
  }
  
  .list-add-list {
      margin-bottom: 16px;

      &__new {
          margin-top: 16px;
          text-align: center;
      }
  }
</style>
