<script>
    import {_} from "svelte-i18n";
    import UserItem from "../../../routes/(app)/profile/[handle]/UserItem.svelte";
    import Modal from "$lib/components/ui/Modal.svelte";

    let { members, onclose } = $props();
</script>

<Modal title="{$_('official_list_member')}" {onclose}>
    <div class="likes">
        {#each members as member}
            <UserItem user={member.subject}></UserItem>
        {/each}
    </div>
</Modal>
