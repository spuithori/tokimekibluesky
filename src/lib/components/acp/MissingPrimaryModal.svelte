<script>
    import Unplug from '@lucide/svelte/icons/unplug';
    import AcpProfileCard from "$lib/components/acp/AcpProfileCard.svelte";
    import { fly } from 'svelte/transition';
    import {liveQuery} from "dexie";
    import {accountsDb} from "$lib/db";
    import {_} from "svelte-i18n";
    import {appState} from "$lib/classes/appState.svelte.js";

    let profile = $derived(liveQuery(async () => {
        const profile = await accountsDb.profiles.get(appState.profile.current);
        return profile;
    }))
</script>

<div class="modal" transition:fly="{{ y: 30, duration: 250 }}">
    <div class="modal-contents">
        <div class="modal-heading-icon">
            <Unplug size={48} color="var(--danger-color)" />
        </div>

        <h1 class="modal-title modal-title--smaller modal-title--center">{$_('missing_primary_title')}</h1>

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
