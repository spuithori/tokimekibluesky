<script lang="ts">
    import {agent, listModal, userLists} from "$lib/stores";
    import ListModal from "$lib/components/list/ListModal.svelte";

  let { _agent = $agent, onclose } = $props();

    function handleListRemove(id) {
        userLists.update(lists => {
            return lists.filter(list => list.id !== id);
        });
        localStorage.setItem('lists', JSON.stringify($userLists));
        onclose?.(id);

        $listModal.open = false;
    }

    function handleListClose() {
        $listModal.open = false;
    }
</script>

{#if ($listModal.open)}
  <ListModal id={$listModal.data} onremove={handleListRemove} onclose={handleListClose} {_agent}></ListModal>
{/if}