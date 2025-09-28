<script lang="ts">
  import {SquareArrowOutUpRight} from "lucide-svelte";
  import {onMount} from "svelte";
  import {_} from "svelte-i18n";
  import AtmosphereAboutModal from "$lib/components/profile/AtmosphereAboutModal.svelte";
  import {intlRelativeTimeFormatState} from "$lib/classes/intlRelativeTimeFormatState.svelte";
  import {parseISO} from "date-fns";
  import {BskyAgent} from "@atproto/api";

  let { did, handle, endpoint } = $props();

  const _agent = new BskyAgent({service: endpoint});
  let latestFlushes = $state();
  let collections: string[] = $state([]);
  let isOpen = $state(false);

  function handleClose() {
      isOpen = false;
  }

  async function getCollections() {
    try {
      const { data } = await _agent.com.atproto.repo.describeRepo({repo: did});
      return data?.collections || [];
    } catch (e) {
      return false;
    }
  }

  async function getFlushes() {
    try {
      const res = await _agent.api.com.atproto.repo.listRecords({
        repo: did,
        collection: 'im.flushing.right.now',
        limit: 1,
      });
      const records = res.data.records;
      return records[0]?.value;
    } catch (e) {
      return false;
    }
  }

  onMount(async () => {
    [collections, latestFlushes] = await Promise.all([getCollections(), getFlushes()]);
  })
</script>

<p class="atmos-heading"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-globe"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg> Atmosphere</p>

<div class="atmos-wrap">
  <div class="atmos-list">
    {#if (collections.includes('blue.linkat.board'))}
      <div class="atmos-item atmos-item--linkat">
        <p class="atmos-item__title"><strong>Linkat</strong> - {$_('atmosphere_short_desc_linkat')}</p>
        <a class="atmos-item__link" href="https://linkat.blue/{handle}" target="_blank" rel="noreferrer noopener nofollow">linkat.blue</a>

        <span class="atmos-item__ext">
          <SquareArrowOutUpRight size="16" color="var(--text-color-3)"></SquareArrowOutUpRight>
        </span>
      </div>
    {/if}

    {#if (collections.includes('com.whtwnd.blog.entry'))}
      <div class="atmos-item atmos-item--whitewind">
        <p class="atmos-item__title"><strong>WhiteWind</strong> - {$_('atmosphere_short_desc_whitewind')}</p>
        <a class="atmos-item__link" href="https://whtwnd.com/{handle}" target="_blank" rel="noreferrer noopener nofollow">whtwnd.com</a>

        <span class="atmos-item__ext">
          <SquareArrowOutUpRight size="16" color="var(--text-color-3)"></SquareArrowOutUpRight>
        </span>
      </div>
    {/if}

    {#if (collections.includes('com.shinolabs.pinksea.oekaki'))}
      <div class="atmos-item atmos-item--pinksea">
        <p class="atmos-item__title"><strong>PinkSea</strong> - {$_('atmosphere_short_desc_pinksea')}</p>
        <a class="atmos-item__link" href="https://pinksea.art/{did}" target="_blank" rel="noreferrer noopener nofollow">pinksea.art</a>

        <span class="atmos-item__ext">
          <SquareArrowOutUpRight size="16" color="var(--text-color-3)"></SquareArrowOutUpRight>
        </span>
      </div>
    {/if}

    {#if (latestFlushes)}
      <div class="atmos-item atmos-item--flushes">
        <p class="atmos-item__title"><strong>Flushes</strong></p>
        <a class="atmos-item__link" href="https://flushes.app/profile/{handle}" target="_blank" rel="noreferrer noopener nofollow">{latestFlushes?.emoji} {intlRelativeTimeFormatState.format({ laterDate: parseISO(latestFlushes?.createdAt) })}</a>

        <span class="atmos-item__ext">
          <SquareArrowOutUpRight size="16" color="var(--text-color-3)"></SquareArrowOutUpRight>
        </span>
      </div>
    {/if}

    {#if (collections.includes('com.skybemoreblue.intro.introduction'))}
      <div class="atmos-item atmos-item--pinksea">
        <p class="atmos-item__title"><strong>SkyBeMoreBlue</strong></p>
        <a class="atmos-item__link" href="https://www.skybemoreblue.com/user/{did}" target="_blank" rel="noreferrer noopener nofollow">skybemoreblue.com</a>

        <span class="atmos-item__ext">
          <SquareArrowOutUpRight size="16" color="var(--text-color-3)"></SquareArrowOutUpRight>
        </span>
      </div>
    {/if}

    {#if (collections.includes('blue.rito.feed.bookmark'))}
      <div class="atmos-item atmos-item--rito">
        <p class="atmos-item__title"><strong>Rito</strong></p>
        <a class="atmos-item__link" href="https://rito.blue/ja/profile/{handle}" target="_blank" rel="noreferrer noopener nofollow">rito.blue</a>

        <span class="atmos-item__ext">
          <SquareArrowOutUpRight size="16" color="var(--text-color-3)"></SquareArrowOutUpRight>
        </span>
      </div>
    {/if}
  </div>

  <a href="/atproto-viewer/{did}" class="atmos-viewer-button">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-database-icon lucide-database"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>
  </a>

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

  .atmos-viewer-button {
    display: grid;
    place-content: center;
    position: absolute;
    width: 30px;
    height: 30px;
    bottom: 4px;
    right: 38px;

    &:hover {
      opacity: .7;
    }
  }
</style>