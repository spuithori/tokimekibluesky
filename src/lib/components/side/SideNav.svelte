<script lang="ts">
  import {agent, settings, sideState} from '$lib/stores';
  import {Pen, Search, Bell, User2, GanttChartSquare, Store, MessageCircleMore} from 'lucide-svelte';
    import MyProfileBadge from "../../../routes/(app)/MyProfileBadge.svelte";

  function toggleSideNav(name) {
      $sideState = name;
  }
</script>

<ul class="side-nav side-nav--{$settings.design?.publishPosition}">
  {#if $settings.design?.publishPosition !== 'bottom'}
    <li class="side-nav__item">
      <button
          class="side-nav__button side-nav__button--publish"
          class:side-nav__button--current={$sideState === 'publish'}
          onclick={() => toggleSideNav('publish')}
          aria-label="Publish Tab"
      >
        <Pen color="var(--nav-secondary-icon-color)"></Pen>
      </button>
    </li>

    <li class="side-nav__item">
      <button
          class="side-nav__button"
          class:side-nav__button--current={$sideState === 'profile'}
          onclick={() => toggleSideNav('profile')}
          aria-label="Profile Tab"
      >
        <User2 color="var(--nav-secondary-icon-color)"></User2>
      </button>
    </li>

    <li class="side-nav__item">
      <button
          class="side-nav__button"
          class:side-nav__button--current={$sideState === 'notification'}
          onclick={() => toggleSideNav('notification')}
          aria-label="Notification Tab"
      >
        <Bell color="var(--nav-secondary-icon-color)"></Bell>
      </button>
    </li>

    <li class="side-nav__item">
      <button
          class="side-nav__button"
          class:side-nav__button--current={$sideState === 'feeds'}
          onclick={() => toggleSideNav('feeds')}
          aria-label="Feed Store Tab"
      >
        <GanttChartSquare color="var(--nav-secondary-icon-color)"></GanttChartSquare>
      </button>
    </li>

    {#if !$settings?.general?.disableChat}
      <li class="side-nav__item">
        <button
                class="side-nav__button"
                class:side-nav__button--current={$sideState === 'chat'}
                onclick={() => toggleSideNav('chat')}
                aria-label="Chat Tab"
        >
          <MessageCircleMore color="var(--nav-secondary-icon-color)"></MessageCircleMore>
        </button>
      </li>
    {/if}

    <li class="side-nav__item side-nav__item--right">
      <a
          href="/search"
          class="side-nav__button"
          aria-label="Search"
      >
        <Search color="var(--bar-bottom-icon-color)"></Search>
      </a>
    </li>
  {:else}
    <li class="side-nav__item">
      <div class="side-nav__button">
        {#if ($agent)}
          <MyProfileBadge handle={$agent.handle()} color="var(--bar-bottom-icon-color)"></MyProfileBadge>
        {/if}
      </div>
    </li>

    {#if !$settings?.general?.disableChat}
      <li class="side-nav__item">
        <a href="/chat" class="side-nav__button">
          <MessageCircleMore color="var(--bar-bottom-icon-color)"></MessageCircleMore>
        </a>
      </li>
    {/if}

    <li class="side-nav__item">
      <a href="/search" class="side-nav__button">
        <Search color="var(--bar-bottom-icon-color)"></Search>
      </a>
    </li>
  {/if}
</ul>

<style lang="postcss">
  .side-nav {
      list-style: none;
      display: flex;

      @media (max-width: 767px) {
          display: none;
      }

      &__item {
          &--right {
              margin-left: auto;
          }
      }

      &__button {
          display: grid;
          place-content: center;
          width: 48px;
          height: 48px;
          border-radius: 5px;
          position: relative;
          transition: background-color .2s linear;

          &:hover {
              &::after {
                  opacity: 1;
              }
          }

          &::before {
              content: '';
              display: block;
              position: absolute;
              left: 0;
              right: 0;
              top: 0;
              width: var(--nav-current-bar-width);
              height: var(--nav-current-bar-height);
              border-radius: var(--nav-current-bar-border-radius);
              background-color: var(--nav-current-bar-color);
              margin: auto;
              transform: scaleX(0);
              transition: transform .25s cubic-bezier(0, 0, 0.18, 1);
          }

        &::after {
            content: '';
            display: block;
            position: absolute;
            left: 6px;
            right: 6px;
            bottom: 6px;
            top: 6px;
            border-radius: var(--border-radius-2);
            background-color: var(--side-nav-hover-bg-color);
            z-index: -1;
            opacity: 0;
            transition: opacity .25s cubic-bezier(0, 0, 0.18, 1);
        }

          &--current {
              &::before {
                  transform: scaleX(1);
              }
          }
      }

      &--bottom {
          flex-direction: column;
          gap: 8px;

          @media (max-width: 767px) {
              justify-content: flex-start;
              padding: 0;
          }

          .side-nav__button {
              &::before {
                  content: none;
              }

              &--publish {
                  display: none;
              }
          }
      }
  }
</style>