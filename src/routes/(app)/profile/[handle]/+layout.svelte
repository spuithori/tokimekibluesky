<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { agent } from '$lib/stores';
    import { afterUpdate, onMount } from 'svelte';
    import { page } from '$app/stores';
    let profile = Promise;

    import type { LayoutData } from './$types';
    import UserFollowButton from "./UserFollowButton.svelte";
    import {afterNavigate} from "$app/navigation";

    export let data: LayoutData;
    let currentPage = 'posts';
    $: handle = $page.params.handle

    async function load() {
        let profile = await $agent.agent.api.app.bsky.actor.getProfile({actor: handle});
        return profile.data
    }

    afterNavigate(async() => {
        profile = load();
    })

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
            default:
                currentPage = 'posts';
        }
    }

    afterUpdate(async() => {
        isActive();
        // console.log(await profile)
    })
</script>

<section class="profile">
  {#await profile}
    <div class="placeholder animate-pulse"></div>
  {:then profile}

    <div class="profile-banner">
      {#if (profile.banner)}
        <img src="{profile.banner}" alt="" loading="lazy">
      {/if}
    </div>

    <div class="profile-column">
      <div class="profile-avatar">
        {#if (profile.avatar)}
          <img src="{profile.avatar}" alt="">
        {/if}
      </div>

      <div class="profile-content">
        <h1 class="profile-display-name">{profile.displayName || profile.handle}</h1>
        {#if (profile.displayName)}
          <p class="profile-handle">{profile.handle}</p>
        {/if}

        {#if (profile.description)}
          <div class="profile-description">
            <p class="profile-description__text">{profile.description}</p>
          </div>
        {/if}

        <div class="profile-relationship">
          <p class="profile-relationship__item"><span>{profile.followsCount}</span> {$_('follows')}</p>
          <p class="profile-relationship__item"><span>{profile.followersCount}</span> {$_('followers')}</p>

          {#if (profile.viewer?.followedBy)}
            <p class="profile-relationship__by">{$_('follows_you')}</p>
          {/if}
        </div>

        {#if (profile.did !== $agent.did())}
          <div class="profile-follow-button">
            <UserFollowButton following="{profile.viewer?.following}" user={profile}></UserFollowButton>
          </div>
        {/if}
      </div>
    </div>

    <ul class="profile-tab">
      <li class="profile-tab__item" on:click={() => currentPage = 'posts'} class:profile-tab__item--active={currentPage === 'posts'}><a href="/profile/{data.params.handle}/" data-sveltekit-noscroll>{$_('posts')}</a></li>
      <li class="profile-tab__item" on:click={() => currentPage = 'follow'} class:profile-tab__item--active={currentPage === 'follow'}><a href="/profile/{data.params.handle}/follow" data-sveltekit-noscroll>{$_('follows')}</a></li>
      <li class="profile-tab__item" on:click={() => currentPage = 'follower'} class:profile-tab__item--active={currentPage === 'follower'}><a href="/profile/{data.params.handle}/follower" data-sveltekit-noscroll>{$_('followers')}</a></li>
    </ul>

    <slot></slot>
  {/await}
</section>

<style lang="postcss">
    .profile-banner {
        border-radius: 20px;
        overflow: hidden;
        margin-bottom: 30px;

        @media (max-width: 767px) {
            border-radius: 10px;
            margin-bottom: 20px;
        }
    }

    .profile-banner img {
        width: 100%;
    }

    .profile-column {
        display: grid;
        grid-template-columns: 112px 1fr;
        align-items: flex-start;
        gap: 30px;
        position: relative;

        @media (max-width: 767px) {
            grid-template-columns: 75px 1fr;
            gap: 15px;
        }
    }

    .profile-content {
      word-break: break-all;
    }

    .profile-avatar {
        aspect-ratio: 1 / 1;
        width: 100%;
        border-radius: 50%;
        overflow: hidden;
        background-color: var(--primary-color);
    }

    .profile-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .profile-display-name {
        font-size: 30px;
        margin-bottom: 2px;
        line-height: 1.5;
        letter-spacing: .025em;
        padding-right: 170px;

        @media (max-width: 767px) {
            font-size: 24px;
            padding-right: 0;
        }
    }

    .profile-handle {
        font-size: 16px;
    }

    .profile-description {
        margin-top: 10px;

        &__text {
            line-height: 1.75;
        }
    }

    .profile-relationship {
        font-size: 18px;
        font-weight: 600;
        line-height: 1.5;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0 15px;
        margin-top: 6px;

        &__by {
            font-weight: 400;
            font-size: 15px;
        }
    }

    .profile-relationship__item span {
        color: var(--text-color-2);
    }

    .profile-tab {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        list-style: none;
        border: 1px solid var(--border-color-1);
        background-color: var(--bg-color-1);
        border-radius: 10px;
        overflow: hidden;
        margin: 30px 0;
        font-size: 16px;
        font-weight: 600;
    }

    .profile-tab__item {
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        background-color: var(--bg-color-1);

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

    .profile-follow-button {
        position: absolute;
        top: 0;
        right: 0;

        @media (max-width: 767px) {
            position: static;
            margin-top: 10px;
        }
    }
</style>