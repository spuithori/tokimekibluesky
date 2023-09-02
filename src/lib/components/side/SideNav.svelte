<script lang="ts">
    import {settings, sideState} from '$lib/stores';
  import { Pen, Search, Bell, User2, Settings, Store  } from 'lucide-svelte';

  function toggleSideNav(name) {
      $sideState = name;
  }

</script>

<ul class="side-nav side-nav--{$settings.design?.publishPosition}">
  <li class="side-nav__item">
    <button
        class="side-nav__button side-nav__button--publish"
        class:side-nav__button--current={$sideState === 'publish'}
        on:click={() => toggleSideNav('publish')}
        aria-label="Publish Tab"
    >
      <Pen color="var(--text-color-3)"></Pen>
    </button>
  </li>

  <li class="side-nav__item">
    <button
        class="side-nav__button"
        class:side-nav__button--current={$sideState === 'profile'}
        on:click={() => toggleSideNav('profile')}
        aria-label="Profile Tab"
    >
      <User2 color="var(--text-color-3)"></User2>
    </button>
  </li>

  <li class="side-nav__item">
    <button
        class="side-nav__button"
        class:side-nav__button--current={$sideState === 'search'}
        on:click={() => toggleSideNav('search')}
        aria-label="Search Tab"
    >
      <Search color="var(--text-color-3)"></Search>
    </button>
  </li>

  <li class="side-nav__item">
    <button
        class="side-nav__button"
        class:side-nav__button--current={$sideState === 'notification'}
        on:click={() => toggleSideNav('notification')}
        aria-label="Notification Tab"
    >
      <Bell color="var(--text-color-3)"></Bell>
    </button>
  </li>

  <li class="side-nav__item">
    <button
        class="side-nav__button"
        class:side-nav__button--current={$sideState === 'store'}
        on:click={() => toggleSideNav('store')}
        aria-label="Feed Store Tab"
    >
      <Store color="var(--text-color-3)"></Store>
    </button>
  </li>
</ul>

<style lang="postcss">
  .side-nav {
      list-style: none;
      display: flex;

      @media (max-width: 767px) {
          display: none;
      }

      &__item {

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
              background-color: var(--bg-color-1);
          }

          &::before {
              content: '';
              display: block;
              position: absolute;
              left: 0;
              right: 0;
              top: 0;
              width: 20px;
              height: 4px;
              border-radius: 2px;
              background-color: var(--primary-color);
              margin: auto;
              transform: scaleX(0);
              transition: transform .25s cubic-bezier(0, 0, 0.18, 1);
          }

          &--current {
              &::before {
                  transform: scaleX(1);
              }
          }
      }

      &--bottom {
          justify-content: flex-end;
          padding: 0 8px;

          @media (max-width: 767px) {
              justify-content: flex-start;
          }

          .side-nav__button {
              &:hover {
                  background-color: var(--bg-color-2);
              }

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