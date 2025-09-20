<script lang="ts">
    import {liveQuery} from "dexie";
    import {accountsDb} from "$lib/db";
    import {_} from "svelte-i18n";
    import ProfileMenuItem from "$lib/components/acp/ProfileMenuItem.svelte";
    import Menu from "$lib/components/ui/Menu.svelte";
    import {HelpCircle, MoreHorizontal, Settings} from "lucide-svelte";
    import {appState} from "$lib/classes/appState.svelte";

    let { onclose } = $props();
    let isMenuOpen = $state(false);
    let el = $state();

    let profiles = $derived(liveQuery(async () => {
        const profiles = await accountsDb.profiles
            .limit(10)
            .toArray();
        return profiles;
    }));
</script>

<div class="side-workspace">
    <div class="side-workspace-modal-heading">
        <h3 class="side-workspace-modal-title">{$_('workspace_modal_title')}</h3>

        <p class="side-workspace-modal-button">
            <a href="/settings/profiles" onclick={onclose}>
                <Settings size="18" color="var(--text-color-1)"></Settings>
            </a>
        </p>

        <Menu bind:isMenuOpen={isMenuOpen} buttonClassName="regular-vertical-menu-button">
            {#snippet ref()}
                <MoreHorizontal size="18" color="var(--text-color-1)"></MoreHorizontal>
            {/snippet}

            {#snippet content()}
                <ul class="timeline-menu-list" >
                    <li class="timeline-menu-list__item">
                        <a href="https://docs.tokimeki.blue/ja/usage/profiles" target="_blank" rel="noopener" class="timeline-menu-list__button">
                            <HelpCircle size="20" color="var(--text-color-1)"></HelpCircle>
                            <span>{$_('workspace_help')}</span>
                        </a>
                    </li>
                </ul>
            {/snippet}
        </Menu>
    </div>

    {#if $profiles}
        <div class="p-menu-profiles">
            {#each $profiles as profile}
                <ProfileMenuItem {profile} isCurrent={appState.profile.current === profile.id}></ProfileMenuItem>
            {/each}
        </div>
    {/if}
</div>

<style lang="postcss">
    .side-workspace {
        padding: 16px;
    }

    .side-workspace-modal-heading {
        display: flex;
        gap: 8px;
        align-items: center;
        margin-bottom: 12px;
    }

    .side-workspace-modal-title {
        font-size: 14px;
        font-weight: bold;
        color: var(--text-color-1);
        margin-right: auto;
        cursor: default;
    }
</style>