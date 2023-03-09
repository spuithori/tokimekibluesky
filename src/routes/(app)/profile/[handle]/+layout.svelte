<script lang="ts">
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

    /* onMount(async () => {
        profile = load();
    }) */

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
      <div class="profile-meta">
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
        </div>
      </div>

      <div class="profile-relationship">
        <p class="profile-relationship__item"><span>{profile.followsCount}</span> フォロー</p>
        <p class="profile-relationship__item"><span>{profile.followersCount}</span> フォロワー</p>
      </div>
    </div>

    {#if (profile.did !== $agent.did())}
      <div class="profile-follow-button">
        <UserFollowButton following="{profile.viewer?.following}" user={profile}></UserFollowButton>
      </div>
    {/if}

    {#if (profile.description)}
      <div class="profile-description">
        <p class="profile-description__text">{profile.description}</p>
      </div>
    {/if}

    <ul class="profile-tab">
      <li class="profile-tab__item" on:click={() => currentPage = 'posts'} class:profile-tab__item--active={currentPage === 'posts'}><a href="/profile/{data.params.handle}/" data-sveltekit-noscroll>投稿</a></li>
      <li class="profile-tab__item" on:click={() => currentPage = 'follow'} class:profile-tab__item--active={currentPage === 'follow'}><a href="/profile/{data.params.handle}/follow" data-sveltekit-noscroll>フォロー</a></li>
      <li class="profile-tab__item" on:click={() => currentPage = 'follower'} class:profile-tab__item--active={currentPage === 'follower'}><a href="/profile/{data.params.handle}/follower" data-sveltekit-noscroll>フォロワー</a></li>
    </ul>

    <slot></slot>
  {/await}
</section>

<style>
    .profile-banner {
        border-radius: 20px;
        overflow: hidden;
        margin-bottom: 20px;
    }

    .profile-banner img {
        width: 100%;
    }

    .profile-column {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 40px;
        margin-bottom: 20px;
    }

    .profile-meta {
        display: grid;
        grid-template-columns: 112px 1fr;
        align-items: center;
        gap: 20px;
    }

    .profile-avatar {
        aspect-ratio: 1 / 1;
        height: 100%;
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
        font-size: 24px;
        margin-bottom: 5px;
    }

    .profile-handle {

    }

    .profile-relationship {
        font-size: 20px;
        font-weight: bold;
        line-height: 1.5;
    }

    .profile-relationship__item span {
        color: var(--color-theme-you);
    }

    .user-timeline {
        margin-top: 30px;
    }

    .profile-tab {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        list-style: none;
        border-left: 1px solid #ccc;
        border-top: 1px solid #ccc;
        border-right: 1px solid #ccc;
        border-radius: 10px 10px 0 0;
        overflow: hidden;
        margin-bottom: 20px;
        margin-top: 30px;
    }

    .profile-tab__item {
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        background-color: #FAFCFF;
    }

    .profile-tab__item--active {
        font-weight: bold;
        background-color: var(--primary-color);
        color: #fff;
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
        margin-bottom: 10px;
    }
</style>