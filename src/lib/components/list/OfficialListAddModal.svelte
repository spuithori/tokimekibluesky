<script lang="ts">
    import {agent} from '$lib/stores';
    import {onMount} from "svelte";
    import {createEventDispatcher} from 'svelte';
    import { toast } from "svelte-sonner";
    import {_} from "svelte-i18n";
    import spinner from "$lib/images/loading.svg";
    import OfficialListAddItem from "$lib/components/list/OfficialListAddItem.svelte";
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

<div class="modal modal--small">
  <div class="modal-contents">
    <h2 class="modal-title modal-title--smaller">{$_('list_instant_manage')}: {author.displayName || author.handle}</h2>

    <div class="list-add-list">
      {#if ready}
        {#each lists as list (list)}
          <OfficialListAddItem {list} {_agent} memberDid={author.did}></OfficialListAddItem>
        {:else}
          まずリストをつくろうね。
        {/each}
      {:else}
        <div class="thread-loading">
          <img src={spinner} alt="">
        </div>
      {/if}
    </div>

    <div class="modal-close">
      <button class="button button--sm" on:click={close} disabled={isDisabled}>{$_('close_button')}</button>
    </div>
  </div>
</div>

<style lang="postcss">
  .list-add-list {
      margin-bottom: 16px;
  }
</style>
