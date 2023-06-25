<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { agent } from '$lib/stores';
    import { afterUpdate } from 'svelte';
    import { page } from '$app/stores';
    import type { LayoutData } from './$types';
    import { fly } from 'svelte/transition';
    import UserProfile from "./UserProfile.svelte";
    import type { Snapshot } from './$types';

    export let data: LayoutData;
    let currentPage = 'posts';
    let profile;

    $: handle = $page.params.handle;

    export const snapshot: Snapshot = {
        capture: () => [profile],
        restore: (value) => {
            [profile] = value;
        }
    };

    $: getProfile(handle);

    function getProfile(handle, clear = true) {
        if (clear) {
            profile = undefined;
        }

        $agent.agent.api.app.bsky.actor.getProfile({actor: handle})
            .then(res => {
                profile = res.data
            })
    }

    /* async function load(handle = $page.params.handle, isFlash = true) {
        if (isFlash) {
            profile = undefined;
        }

        const res = await $agent.agent.api.app.bsky.actor.getProfile({actor: handle});
        profile = res.data;

        textArray = new RichText({text: profile.description});
        await textArray.detectFacets($agent.agent);
    } */


    function isActive() {
        const path = data.url.pathname;
        const paths = path.split('/');

        switch (paths[3]) {
            case 'follow':
                currentPage = 'follow';
                break;
            case 'follower':
                currentPage = 'follower';
                break;
            case 'media':
                currentPage = 'media';
                break;
            case 'likes':
                currentPage = 'likes';
                break;
            default:
                currentPage = 'posts';
        }
    }

    function handleRefresh() {
        getProfile(handle, false);
    }

    afterUpdate(async() => {
        isActive();
    })
</script>

{#key currentPage}
  <h1 class="page-nav-title" in:fly={{ x: 10, duration: 100, delay: 100 }}>{$_(currentPage)}</h1>
{/key}

<section class="profile">
  <div class="user-profile-wrap">
    {#if profile}
      <UserProfile handle={handle} profile={profile} on:refresh={handleRefresh}></UserProfile>
    {/if}
  </div>

  {#key $page.params.handle}
    <ul class="profile-tab">
      <li class="profile-tab__item" on:click={() => currentPage = 'posts'} class:profile-tab__item--active={currentPage === 'posts'}><a href="/profile/{data.params.handle}/" data-sveltekit-noscroll>{$_('posts')}</a></li>
      <li class="profile-tab__item" on:click={() => currentPage = 'follow'} class:profile-tab__item--active={currentPage === 'follow'}><a href="/profile/{data.params.handle}/follow" data-sveltekit-noscroll>{$_('follows')}</a></li>
      <li class="profile-tab__item" on:click={() => currentPage = 'follower'} class:profile-tab__item--active={currentPage === 'follower'}><a href="/profile/{data.params.handle}/follower" data-sveltekit-noscroll>{$_('followers')}</a></li>
      <li class="profile-tab__item" on:click={() => currentPage = 'media'} class:profile-tab__item--active={currentPage === 'media'}><a href="/profile/{data.params.handle}/media" data-sveltekit-noscroll>{$_('media')}</a></li>
      <li class="profile-tab__item" on:click={() => currentPage = 'likes'} class:profile-tab__item--active={currentPage === 'likes'}><a href="/profile/{data.params.handle}/likes" data-sveltekit-noscroll>{$_('likes')}</a></li>
    </ul>

    <slot></slot>
  {/key}
</section>

<style lang="postcss">
    .profile-relationship__item span {
        color: var(--text-color-2);
    }

    .profile-tab {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        list-style: none;
        border: 1px solid var(--border-color-1);
        background-color: var(--bg-color-1);
        border-radius: 10px;
        overflow: hidden;
        margin: 30px 0;
        font-size: 16px;
        font-weight: 600;

        @media (max-width: 767px) {
            font-size: 14px;
            grid-template-columns: repeat(3, 1fr);
        }
    }

    .profile-tab__item {
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        background-color: var(--bg-color-1);

        @media (max-width: 767px) {
            height: 42px;
            border-bottom: 1px solid var(--border-color-1);
            border-right: 1px solid var(--border-color-1);

            &:nth-child(3n) {
                border-right: none !important;
            }

            &:nth-child(n + 4) {
                border-bottom: none;
            }
        }

        &:not(:last-child) {
            border-right: 1px solid var(--border-color-1);
        }
    }

    .profile-tab__item--active {
        font-weight: bold;
        background-color: var(--primary-color);
        color: var(--bg-color-1);
    }

    .profile-tab__item a {
        color: inherit;
        text-decoration: none;
    }

    .profile-tab__item a::before {
        content: '';
        display: block;
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
    }
</style>