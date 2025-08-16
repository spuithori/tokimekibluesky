<script>
    import AcpProfileCard from "$lib/components/acp/AcpProfileCard.svelte";
    import { fly } from 'svelte/transition';
    import {liveQuery} from "dexie";
    import {accountsDb} from "$lib/db";
    import { m } from "$lib/paraglide/messages.js";

    let profile = $derived(liveQuery(async () => {
        const profile = await accountsDb.profiles.get(Number(localStorage.getItem('currentProfile')));
        return profile;
    }))
</script>

<div class="modal" transition:fly="{{ y: 30, duration: 250 }}">
    <div class="modal-contents">
        <div class="modal-heading-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--danger-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-unplug"><path d="m19 5 3-3"/><path d="m2 22 3-3"/><path d="M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z"/><path d="M7.5 13.5 10 11"/><path d="M10.5 16.5 13 14"/><path d="m12 6 6 6 2.3-2.3a2.4 2.4 0 0 0 0-3.4l-2.6-2.6a2.4 2.4 0 0 0-3.4 0Z"/></svg>
        </div>

        <h1 class="modal-title modal-title--smaller modal-title--center">{m.missing_primary_title()}</h1>

        <div class="acp-list">
            {#if ($profile)}
                <AcpProfileCard profile={$profile} isCurrent={true}></AcpProfileCard>
            {/if}
        </div>
    </div>
</div>

<style lang="postcss">
    .acp-list {
        margin-top: 36px;
    }
</style>
