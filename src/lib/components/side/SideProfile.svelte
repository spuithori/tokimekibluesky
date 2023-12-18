<script lang="ts">
  import AgentsSelector from "$lib/components/acp/AgentsSelector.svelte";
  import {agent, agents} from "$lib/stores";
  import {_} from "svelte-i18n";
  import { page } from '$app/stores';
  import {LayoutList, UserCheck2, UserPlus2, Image, Heart, ShieldBan, VolumeX} from 'lucide-svelte';

  let _agent = $agent;

  function handleAgentSelect(event) {
      _agent = event.detail.agent;
  }
</script>

<div class="side-profile">
  <section class="side-profile-profiles">
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

        <li class="p-menu-nav__item">
          <div class="p-menu-nav__icon">
            <VolumeX color="var(--text-color-1)"></VolumeX>
          </div>
          <p class="p-menu-nav__title"><a href="/mutes/{_agent.did()}" data-sveltekit-noscroll>{$_('mutes_list')}</a></p>
        </li>

        <li class="p-menu-nav__item">
          <div class="p-menu-nav__icon">
            <ShieldBan color="var(--text-color-1)"></ShieldBan>
          </div>
          <p class="p-menu-nav__title"><a href="/blocks/{_agent.did()}" data-sveltekit-noscroll>{$_('blocks_list')}</a></p>
        </li>
      </ul>
    {/key}
  </section>
</div>

<style lang="postcss">
  .side-profile {
      padding: 16px;
  }

  .side-profile-profiles {
      margin-bottom: 16px;
  }
</style>