<script>
    import {_} from "svelte-i18n";
    import {createEventDispatcher} from 'svelte';
    const dispatch = createEventDispatcher();
    import UserItem from "../../../routes/(app)/profile/[handle]/UserItem.svelte";
    import Modal from "$lib/components/ui/Modal.svelte";

    let { members } = $props();
</script>

<Modal title="{$_('official_list_member')}" on:close>
    <div class="likes">
        {#each members as member}
            <UserItem user={member.subject}></UserItem>
        {/each}
    </div>
</Modal>
