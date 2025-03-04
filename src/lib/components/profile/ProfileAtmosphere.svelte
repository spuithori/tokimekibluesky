<script lang="ts">
  import {SquareArrowOutUpRight} from "lucide-svelte";
  import {onMount} from "svelte";
  import {_} from "svelte-i18n";
  import AtmosphereAboutModal from "$lib/components/profile/AtmosphereAboutModal.svelte";

  let { did, handle, _agent } = $props();

  let hasLinkat = $state(false);
  let hasWhiteWind = $state(false);
  let hasPinkSea = $state(false);
  let isOpen = $state(false);

  function handleClose() {
      isOpen = false;
  }

  async function getLinkat() {
      try {
          const res = await _agent.api.com.atproto.repo.listRecords({
              repo: did,
              collection: 'blue.linkat.board',
              limit: 1,
          });
          const records = res.data.records;
          return records.length > 0;
      } catch (e) {
          return false;
      }
  }

  async function getWhiteWind() {
      try {
          const res = await _agent.api.com.atproto.repo.listRecords({
              repo: did,
              collection: 'com.whtwnd.blog.entry',
              limit: 1,
          });
          const records = res.data.records;
          return records.length > 0;
      } catch (e) {
          return false;
      }
  }

  async function getPinkSea() {
      try {
          const res = await _agent.api.com.atproto.repo.listRecords({
              repo: did,
              collection: 'com.shinolabs.pinksea.oekaki',
              limit: 1,
          });
          const records = res.data.records;
          return records.length > 0;
      } catch (e) {
          return false;
      }
  }

  onMount(async () => {
      [hasLinkat, hasWhiteWind, hasPinkSea] = await Promise.all([getLinkat(), getWhiteWind(), getPinkSea()]);
  })
</script>

<p class="atmos-heading"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-globe"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg> Atmosphere</p>

<div class="atmos-wrap">
  <div class="atmos-list">
    {#if (hasLinkat)}
      <div class="atmos-item atmos-item--linkat">
        <p class="atmos-item__title"><strong>Linkat</strong> - {$_('atmosphere_short_desc_linkat')}</p>
        <a class="atmos-item__link" href="https://linkat.blue/{handle}" target="_blank" rel="noreferrer noopener nofollow">linkat.blue</a>

        <span class="atmos-item__ext">
          <SquareArrowOutUpRight size="16" color="var(--text-color-3)"></SquareArrowOutUpRight>
      </span>
      </div>
    {/if}

    {#if (hasWhiteWind)}
      <div class="atmos-item atmos-item--whitewind">
        <p class="atmos-item__title"><strong>WhiteWind</strong> - {$_('atmosphere_short_desc_whitewind')}</p>
        <a class="atmos-item__link" href="https://whtwnd.com/{handle}" target="_blank" rel="noreferrer noopener nofollow">whtwnd.com</a>

        <span class="atmos-item__ext">
          <SquareArrowOutUpRight size="16" color="var(--text-color-3)"></SquareArrowOutUpRight>
      </span>
      </div>
    {/if}

    {#if (hasPinkSea)}
      <div class="atmos-item atmos-item--pinksea">
        <p class="atmos-item__title"><strong>PinkSea</strong> - {$_('atmosphere_short_desc_pinksea')}</p>
        <a class="atmos-item__link" href="https://pinksea.art/{did}" target="_blank" rel="noreferrer noopener nofollow">pinksea.art</a>

        <span class="atmos-item__ext">
          <SquareArrowOutUpRight size="16" color="var(--text-color-3)"></SquareArrowOutUpRight>
      </span>
      </div>
    {/if}
  </div>

  <button class="atmos-modal-toggle" aria-label="About" onclick={() => {isOpen = !isOpen}}>
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
  </button>
</div>

{#if isOpen}
  <AtmosphereAboutModal onclose={handleClose}></AtmosphereAboutModal>
{/if}

<style lang="postcss">
  .atmos-heading {
      writing-mode: vertical-rl;
      display: flex;
      align-items: center;
      gap: 4px;
      color: var(--border-color-1);
      position: absolute;
      left: 8px;
      top: 8px;
      letter-spacing: .05em;
      cursor: default;
  }

  .atmos-wrap {
      position: relative;
      z-index: 1;
      padding: 16px 16px 16px 36px;
      height: 100%;
      overflow-y: auto;
  }

  .atmos-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 0;
  }

  .atmos-item {
      position: relative;
      padding: 8px;
      border-radius: var(--border-radius-3);
      background-color: var(--bg-color-3);
      min-height: 64px;

      &__title {
          color: var(--text-color-2);
      }

      &__ext {
          position: absolute;
          display: block;
          top: 8px;
          right: 8px;
          pointer-events: none;
      }

      &__link {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 14px;
          color: var(--text-color-3);

          &::before {
              content: '';
              display: block;
              position: absolute;
              inset: 0;
              z-index: 1;
          }
      }
  }

  .atmos-modal-toggle {
      display: grid;
      place-content: center;
      position: absolute;
      width: 30px;
      height: 30px;
      bottom: 4px;
      right: 4px;

      &:hover {
          opacity: .7;
      }
  }
</style>