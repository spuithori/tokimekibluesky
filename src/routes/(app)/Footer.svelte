<script lang="ts">
  import { settings } from "$lib/stores";
  import {scrollDirectionState} from "$lib/classes/scrollDirectionState.svelte";
  import SideNav from "$lib/components/side/SideNav.svelte";
</script>

<footer class="footer" class:footer--scroll-down={scrollDirectionState.direction === 'down'} class:footer--fixed={$settings.design?.fixedFooter}
 class:footer--mobileV2={$settings.design?.mobileNewUi}>
  <div class="footer__wrap">
    <SideNav footer={true}></SideNav>
  </div>
</footer>

<style lang="postcss">
  .footer {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      box-shadow: 0 -1px 6px rgba(61, 120, 209, .09);
      background-color: var(--bg-color-1);
      z-index: 999;

      @media (min-width: 767px) {
          display: none;
      }

      @media (max-width: 767px) {
          transition: transform .25s cubic-bezier(0.16, 0.01, 0.3, 0.98);
      }

      &__wrap {
          display: flex;
          align-items: center;
          padding: 0 0 var(--safe-area-bottom);
          height: calc(56px + var(--safe-area-bottom));
      }

      &--hidden {
          @media (max-width: 767px) {
              transform: translateY(calc(70px + var(--safe-area-bottom)));
          }
      }

      &--scroll-down {
          @media (max-width: 767px) {
              transform: translateY(calc(70px + var(--safe-area-bottom)));

              &.footer--fixed {
                  transform: none;
              }
          }
      }

      &--mobileV2 {
          background-color: transparent;
          box-shadow: none;

          &::before {
              content: none;
          }
      }
  }
</style>