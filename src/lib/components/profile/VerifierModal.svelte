<script lang="ts">
    import { onMount } from "svelte";
    import {_} from "svelte-i18n";
    import UserItem from "../../../routes/(app)/profile/[handle]/UserItem.svelte";
    import Modal from "$lib/components/ui/Modal.svelte";

    let { did, _agent, onclose } = $props();
    let profile = $state();

    onMount(async () => {
        try {
            const res = await _agent.agent.api.app.bsky.actor.getProfile({actor: did});
            profile = res.data;
        } catch (e) {
            console.error(e);
        }
    })
</script>

<Modal title={$_('verified_by')} size="small" {onclose}>
    <div class="likes">
        <p class="text">{$_('verified_by_description')}</p>
        {#if profile}
            <UserItem user={profile}></UserItem>
        {/if}
    </div>
</Modal>

<style lang="postcss">
    .text {
        margin-bottom: 8px;
    }
</style>