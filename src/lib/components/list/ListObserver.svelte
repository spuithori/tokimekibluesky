<script lang="ts">
    import {agent, listModal, userLists} from "$lib/stores";
    import ListModal from "$lib/components/list/ListModal.svelte";
    import {createEventDispatcher} from 'svelte';
    const dispatch = createEventDispatcher();

  let { _agent = $agent } = $props();

    function handleListRemove(event) {
        userLists.update(lists => {
            return lists.filter(list => list.id !== event.detail.id);
        });
        localStorage.setItem('lists', JSON.stringify($userLists));
        dispatch('close', event.detail);

        $listModal.open = false;
    }

    function handleListClose() {
        $listModal.open = false;
    }
</script>

{#if ($listModal.open)}
  <ListModal id={$listModal.data} on:remove={handleListRemove} on:close={handleListClose} {_agent}></ListModal>
{/if}