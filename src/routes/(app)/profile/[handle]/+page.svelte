<script lang="ts">
    import { agent } from '$lib/stores';
    import { onMount } from 'svelte';
    import UserTimeline from './UserTimeline.svelte';
    let profile = Promise;

    import type { PageData } from './$types';
    import {invalidateAll} from "$app/navigation";
    import {browser} from "$app/environment";

    export let data: PageData;

    if (browser) {
        invalidateAll()
    }
    async function load() {
        let profile = await $agent.agent.api.app.bsky.actor.getProfile({actor: data.params.handle});
        return profile.data
    }
    profile = load();
</script>

<section class="profile">
  {#await profile}
    <div class="placeholder animate-pulse"></div>
  {:then profile}

    <div class="profile-banner">
      <img src="{profile.banner}" alt="" loading="lazy">
    </div>

    <div class="profile-column">
      <div class="profile-meta">
        <div class="profile-avatar">
          <img src="{profile.avatar}" alt="">
        </div>

        <div class="profile-content">
          <h1 class="profile-display-name">{profile.displayName}</h1>
          <p class="profile-handle">{profile.handle}</p>
        </div>
      </div>

      <div class="profile-relationship">
        <p class="profile-relationship__item"><span>{profile.followsCount}</span> フォロー</p>
        <p class="profile-relationship__item"><span>{profile.followersCount}</span> フォロワー</p>
      </div>
    </div>

    <div class="profile-description">
      <p class="profile-description__text">{profile.description}</p>
    </div>

    <div class="user-timeline">
      <UserTimeline author={profile.did}></UserTimeline>
    </div>
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
  }

  .profile-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
  }

  .profile-display-name {
      font-size: 24px !important;
      margin-bottom: 5px;
  }

  .profile-handle {

  }

  .profile-relationship {
      font-size: 20px !important;
      font-weight: bold;
      line-height: 1.5;
  }

  .profile-relationship__item span {
      color: var(--color-theme-2);
  }

  .user-timeline {
      margin-top: 30px;
  }
</style>