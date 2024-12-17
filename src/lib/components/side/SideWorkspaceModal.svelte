<script lang="ts">
    import {liveQuery} from "dexie";
    import {accountsDb} from "$lib/db";
    import {_} from "svelte-i18n";
    import ProfileMenuItem from "$lib/components/acp/ProfileMenuItem.svelte";
    import { clickOutside } from '$lib/clickOutSide';
    import { fade } from 'svelte/transition';
    import Menu from "$lib/components/ui/Menu.svelte";
    import {settings} from "$lib/stores";
    import {HelpCircle} from "lucide-svelte";

    let {
        close
    } = $props();
    let isMenuOpen = $state(false);

    let profiles = $derived(liveQuery(async () => {
        const profiles = await accountsDb.profiles
            .limit(10)
            .toArray();
        return profiles;
    }));

    let currentProfile = $derived(Number(localStorage.getItem('currentProfile') || profiles[0].id ));

    function handleClose() {
        close();
    }
</script>

<div class="side-workspace-modal"
     class:side-workspace-modal--mobileV2={$settings?.design?.mobileNewUi}
     use:clickOutside={{ignoreElement: '.side-workspace-button'}}
     onoutclick={handleClose}
     transition:fade={{duration: 100}}
>
    <div class="side-workspace-modal-heading">
        <h3 class="side-workspace-modal-title">{$_('workspace_modal_title')}</h3>

        <p class="side-workspace-modal-button">
            <a href="/settings/profiles"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg></a>
        </p>

        <Menu bind:isMenuOpen={isMenuOpen} buttonClassName="regular-vertical-menu-button">
            {#snippet ref()}
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-more-horizontal"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
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
                <ProfileMenuItem {profile} isCurrent={currentProfile === profile.id}></ProfileMenuItem>
            {/each}
        </div>
    {/if}
</div>

<style lang="postcss">
    .side-workspace-modal {
        position: absolute;
        top: 56px;
        left: 12px;
        z-index: 100;
        width: 280px;
        background-color: var(--bg-color-1);
        padding: 12px 8px 8px;
        border-radius: var(--border-radius-2);
        box-shadow: 0 0 10px var(--box-shadow-color-1);

        &--mobileV2 {
            top: auto;
            bottom: 118px;
        }
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