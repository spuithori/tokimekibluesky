<script lang="ts">
  import AgentsSelector from "$lib/components/acp/AgentsSelector.svelte";
  import {agent, agents} from "$lib/stores";
  import UserProfile from "../../../routes/(app)/profile/[handle]/UserProfile.svelte";
  import {_} from "svelte-i18n";
  import { page } from '$app/stores';
  import { LayoutList, UserCheck2, UserPlus2, Image, Heart } from 'lucide-svelte';
  import ProfileMenuItem from "$lib/components/acp/ProfileMenuItem.svelte";
  import {liveQuery} from "dexie";
  import {accountsDb} from "$lib/db";

  let _agent = $agent;

  function handleAgentSelect(event) {
      _agent = event.detail.agent;
  }

  $: profiles = liveQuery(async () => {
      const profiles = await accountsDb.profiles
          .limit(3)
          .toArray();
      return profiles;
  });

  $: currentProfile = Number(localStorage.getItem('currentProfile') || profiles[0].id );
</script>

<div class="side-profile">
  <section class="side-profile-profiles">
    <h3 class="p-menu-title">{$_('p_menu_profiles')}</h3>

    {#if $profiles}
      <div class="p-menu-profiles">
        {#each $profiles as profile}
          <ProfileMenuItem {profile} isCurrent={currentProfile === profile.id} on:reload></ProfileMenuItem>
        {/each}
      </div>
    {/if}

    <div class="p-menu-profiles-more">
      <p class="p-menu-profiles-more__title"><a href="/settings/profiles">{$_('profiles_and_accounts_management')}</a></p>
    </div>
  </section>

  <section class="side-profile-profiles">
    <h3 class="p-menu-title">{$_('p_menu_my_accounts')}</h3>

    {#if $agents.size > 1}
      <div class="side-agents-selector">
        <AgentsSelector on:select={handleAgentSelect}></AgentsSelector>
      </div>
    {/if}

    {#key _agent}
      <ul class="p-menu-nav">
        <li class="p-menu-nav__item"
            class:p-menu-nav__item--current={$page.url.pathname === '/profile/' + _agent.handle()}
        >
          <div class="p-menu-nav__icon">
            <LayoutList color="var(--text-color-1)"></LayoutList>
          </div>
          <p class="p-menu-nav__title"><a href="/profile/{_agent.handle()}/" data-sveltekit-noscroll>{$_('posts/profiles')}</a></p>
        </li>

        <li class="p-menu-nav__item"
            class:p-menu-nav__item--current={$page.url.pathname === '/profile/' + _agent.handle() + '/follow'}
        >
          <div class="p-menu-nav__icon">
            <UserCheck2 color="var(--text-color-1)"></UserCheck2>
          </div>
          <p class="p-menu-nav__title"><a href="/profile/{_agent.handle()}/follow" data-sveltekit-noscroll>{$_('follows')}</a></p>
        </li>

        <li class="p-menu-nav__item"
            class:p-menu-nav__item--current={$page.url.pathname === '/profile/' + _agent.handle() + '/follower'}
        >
          <div class="p-menu-nav__icon">
            <UserPlus2 color="var(--text-color-1)"></UserPlus2>
          </div>
          <p class="p-menu-nav__title"><a href="/profile/{_agent.handle()}/follower" data-sveltekit-noscroll>{$_('followers')}</a></p>
        </li>

        <li class="p-menu-nav__item"
            class:p-menu-nav__item--current={$page.url.pathname === '/profile/' + _agent.handle() + '/media'}
        >
          <div class="p-menu-nav__icon">
            <Image color="var(--text-color-1)"></Image>
          </div>
          <p class="p-menu-nav__title"><a href="/profile/{_agent.handle()}/media" data-sveltekit-noscroll>{$_('media')}</a></p>
        </li>

        <li class="p-menu-nav__item"
            class:p-menu-nav__item--current={$page.url.pathname === '/profile/' + _agent.handle() + '/likes'}
        >
          <div class="p-menu-nav__icon">
            <Heart color="var(--text-color-1)"></Heart>
          </div>
          <p class="p-menu-nav__title"><a href="/profile/{_agent.handle()}/likes" data-sveltekit-noscroll>{$_('likes')}</a></p>
        </li>
      </ul>
    {/key}
  </section>
</div>

<style lang="postcss">
  .side-profile {
      padding: 16px;
  }

  .side-profile-content {
      margin-bottom: 16px;
  }

  .side-profile-profiles {
      margin-bottom: 16px;
  }
</style>