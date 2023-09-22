<script lang="ts">
    import { _ } from 'svelte-i18n';
    import {agent, settings} from '$lib/stores';
    import { afterUpdate } from 'svelte';
    import { page } from '$app/stores';
    import type { LayoutData } from './$types';
    import { fly } from 'svelte/transition';
    import UserProfile from "./UserProfile.svelte";
    import type { Snapshot } from './$types';
    import UserFollowButton from "./UserFollowButton.svelte";
    import UserEdit from "./UserEdit.svelte";
    import ProfileMenu from "$lib/components/profile/ProfileMenu.svelte";
    import PageModal from "$lib/components/ui/PageModal.svelte";

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

    function onProfileUpdate() {
        handleRefresh();
    }

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
            case 'feed':
                currentPage = 'feed';
                break;
            case 'lists':
                currentPage = 'lists';
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

<PageModal>
  <section class="page profile">
    <div class="column-heading">
      {#if profile}
        <div class="column-heading__buttons">
          <button class="settings-back" on:click={() => {history.back()}}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          </button>
        </div>

        <h2 class="column-heading__title">{$_(currentPage)} - {profile.displayName || profile.handle}</h2>

        <div class="column-heading__buttons column-heading__buttons--right">
          {#if (profile.did !== $agent.did())}
            <div class="profile-follow-button">
              <UserFollowButton following="{profile.viewer?.following}" user={profile}></UserFollowButton>
            </div>
          {:else}
            <div class="profile-follow-button profile-follow-button--me">
              <UserEdit {profile} on:update={onProfileUpdate}></UserEdit>
            </div>
          {/if}

          <ProfileMenu {handle} {profile} on:refresh={handleRefresh}></ProfileMenu>
        </div>
      {/if}

      <a class="settings-back" href="/">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </a>
    </div>

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
        <li class="profile-tab__item" on:click={() => currentPage = 'feed'} class:profile-tab__item--active={currentPage === 'feed'}><a href="/profile/{data.params.handle}/feed" data-sveltekit-noscroll>{$_('feeds')}</a></li>
        <li class="profile-tab__item" on:click={() => currentPage = 'lists'} class:profile-tab__item--active={currentPage === 'lists'}><a href="/profile/{data.params.handle}/lists" data-sveltekit-noscroll>{$_('lists')}</a></li>
      </ul>

      <slot></slot>
    {/key}
  </section>
</PageModal>

<style lang="postcss">
    .user-profile-wrap {
        padding: 16px;
    }

    .profile-relationship__item span {
        color: var(--text-color-2);
    }
</style>