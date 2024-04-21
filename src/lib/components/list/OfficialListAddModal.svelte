<script lang="ts">
    import {agent} from '$lib/stores';
    import {onMount} from "svelte";
    import {createEventDispatcher} from 'svelte';
    import { toast } from "svelte-sonner";
    import {_} from "svelte-i18n";
    import OfficialListAddItem from "$lib/components/list/OfficialListAddItem.svelte";
    import Modal from "$lib/components/ui/Modal.svelte";
    import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
    const dispatch = createEventDispatcher();

    export let _agent = $agent;
    export let author;

    let lists = [];
    let isDisabled = false;
    let ready = false;

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

    onMount(async () => {
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
    })

   function close() {
       dispatch('close');
   }
</script>

<Modal title="{$_('list_instant_manage')}" on:close>
  <p class="list-add-author">{author.displayName || author.handle}</p>


  <div class="list-add-list">
    {#if ready}
      {#each lists as list (list)}
        <OfficialListAddItem {list} {_agent} memberDid={author.did}></OfficialListAddItem>
      {:else}
        まずリストをつくろうね。
      {/each}
    {:else}
      <LoadingSpinner></LoadingSpinner>
    {/if}
  </div>
</Modal>

<style lang="postcss">
  .list-add-author {
      font-weight: bold;
      margin-bottom: 8px;
  }
  
  .list-add-list {
      margin-bottom: 16px;
  }
</style>
