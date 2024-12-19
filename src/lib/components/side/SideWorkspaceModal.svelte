<script lang="ts">
    import {liveQuery} from "dexie";
    import {accountsDb} from "$lib/db";
    import {_} from "svelte-i18n";
    import ProfileMenuItem from "$lib/components/acp/ProfileMenuItem.svelte";
    import { offset, flip } from 'svelte-floating-ui/dom';
    import { createFloatingActions } from 'svelte-floating-ui';
    import { fade } from 'svelte/transition';
    import Menu from "$lib/components/ui/Menu.svelte";
    import {settings} from "$lib/stores";
    import {HelpCircle, MoreHorizontal, Settings} from "lucide-svelte";

    let { onclose } = $props();
    let isMenuOpen = $state(false);
    let el = $state();

    let profiles = $derived(liveQuery(async () => {
        const profiles = await accountsDb.profiles
            .limit(10)
            .toArray();
        return profiles;
    }));

    let currentProfile = $derived(Number(localStorage.getItem('currentProfile') || profiles[0].id ));

    const [ floatingRef, floatingContent ] = createFloatingActions({
        strategy: 'absolute',
        placement: 'right-start',
        middleware: [
            offset({
                mainAxis: 16,
                crossAxis: 64,
            }),
            flip(),
        ]
    });

    $effect(() => {
        if (el) {
            el.showModal();
        }
    });

    function handleClick (event) {
        const rect = el.getBoundingClientRect();
        const isInDialog = (rect.top <= event.clientY && event.clientY <= rect.top + rect.height && rect.left <= event.clientX && event.clientX <= rect.left + rect.width);

        if (!isInDialog) {
            onclose();
        }
    }
</script>

<div class="side-workspace-modal-ref" use:floatingRef></div>

<dialog class="side-workspace-modal"
    class:side-workspace-modal--mobileV2={$settings?.design?.mobileNewUi}
    bind:this={el}
    transition:fade={{duration: 100}}
    use:floatingContent
    onclose={onclose}
    onclick={handleClick}
>
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
                <ProfileMenuItem {profile} isCurrent={currentProfile === profile.id}></ProfileMenuItem>
            {/each}
        </div>
    {/if}
</dialog>

<style lang="postcss">
    .side-workspace-modal-ref {
        position: absolute;
        left: 0;
        top: 0;
    }

    .side-workspace-modal {
        position: absolute;
        z-index: 100;
        width: 280px;
        background-color: var(--bg-color-1);
        padding: 12px 8px 8px;
        border-radius: var(--border-radius-2);
        box-shadow: 0 0 10px var(--box-shadow-color-1);
        border: none;

        &::backdrop {
            background-color: transparent;
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