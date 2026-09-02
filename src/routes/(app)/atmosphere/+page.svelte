<script lang="ts">
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import X from '@lucide/svelte/icons/x';
  import Orbit from '@lucide/svelte/icons/orbit';
  import Plus from '@lucide/svelte/icons/plus';
  import { onDestroy } from 'svelte';
  import { _, locale } from 'tokimeki-i18n';
  import { atmospherePresets, presetPath } from '$lib/atmosphere/presets';
  import { fetchAtmosphereServices, localizeService, servicePath } from '$lib/atmosphere/registry';
  import AtmosphereItem from './AtmosphereItem.svelte';

  const controller = new AbortController();
  const entriesPromise = fetchAtmosphereServices(controller.signal);

  onDestroy(() => {
      controller.abort();
  });
</script>

<svelte:head>
  <title>{$_('atmosphere')} - TOKIMEKI</title>
</svelte:head>

<div class="column-heading">
  <div class="column-heading__buttons">
    <button class="settings-back" onclick={() => {history.back()}}>
      <ArrowLeft color="var(--text-color-1)" />
    </button>
  </div>

  <h1 class="column-heading__title">{$_('atmosphere')} <span class="atmosphere-heading-sub">Atmosphere</span></h1>

  <div class="column-heading__buttons column-heading__buttons--right">
    <a class="settings-back" href="/atmosphere/register" aria-label={$_('atmosphere_register_title')}>
      <Plus color="var(--text-color-1)" />
    </a>

    <a class="settings-back" href="/">
      <X color="var(--text-color-1)" />
    </a>
  </div>
</div>

<div class="atmosphere">
  <header class="atmosphere-hero">
    <div class="atmosphere-hero__icon">
      <Orbit size="32" color="var(--primary-color)" />
    </div>
    <div class="atmosphere-hero__body">
      <h2 class="atmosphere-hero__title">{$_('atmosphere')}</h2>
      <p class="atmosphere-hero__lead">{$_('atmosphere_lead')}</p>
    </div>
  </header>

  <section class="atmosphere-section">
    <h3 class="atmosphere-section__title">{$_('atmosphere_made_by_tokimeki')}</h3>

    <div class="atmosphere-grid">
      {#each atmospherePresets as preset (preset.id)}
        <AtmosphereItem name={preset.name} description={$_(preset.taglineKey)} url={preset.url} icon={preset.icon} href={presetPath(preset.id)} category={preset.category} />
      {/each}
    </div>
  </section>

  <section class="atmosphere-section">
    <h3 class="atmosphere-section__title">{$_('atmosphere_community')}</h3>
    <p class="atmosphere-section__lead">{$_('atmosphere_community_lead')}</p>

    {#await entriesPromise then entries}
      {#if entries.length}
        <div class="atmosphere-grid">
          {#each entries as entry (entry.uri)}
            {@const service = localizeService(entry, $locale)}
            <AtmosphereItem name={service.name} description={service.tagline || service.description} url={service.url} icon={service.iconUrl} href={servicePath(entry.did, entry.rkey)} category={service.category} />
          {/each}
        </div>
      {:else}
        <p class="atmosphere-status">{$_('atmosphere_community_empty')}</p>
      {/if}
    {:catch}
      <p class="atmosphere-status">{$_('atmosphere_community_error')}</p>
    {/await}
  </section>

  <section class="atmosphere-register">
    <div class="atmosphere-register__body">
      <h3 class="atmosphere-register__title">{$_('atmosphere_register_title')}</h3>
      <p class="atmosphere-register__text">{$_('atmosphere_register_description')}</p>
    </div>
    <a class="button button--sm" href="/atmosphere/register">{$_('atmosphere_register_button')}</a>
  </section>
</div>

<style lang="postcss">
  .atmosphere-heading-sub {
      margin-left: 6px;
      font-size: 12px;
      font-weight: normal;
      letter-spacing: .04em;
      color: var(--text-color-3);
  }

  .atmosphere {
      padding: 8px 24px 40px;

      @media (max-width: 767px) {
          padding: 8px 8px 32px;
      }
  }

  .atmosphere-hero {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 28px 12px 24px;

      @media (max-width: 767px) {
          flex-direction: column;
          text-align: center;
          gap: 6px;
          padding: 24px 16px 20px;
      }

      &__icon {
          flex-shrink: 0;
          display: grid;
          place-content: center;
          width: 72px;
          height: 72px;
          border-radius: 22px;
          background-color: var(--bg-color-3);

          @media (max-width: 767px) {
              width: 56px;
              height: 56px;
              border-radius: 18px;
              margin-bottom: 6px;
          }
      }

      &__body {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;

          @media (max-width: 767px) {
              align-items: center;
          }
      }

      &__title {
          font-size: 24px;
          font-weight: bold;
          letter-spacing: .04em;
          color: var(--text-color-1);
      }

      &__lead {
          max-width: 640px;
          font-size: 14px;
          line-height: 1.6;
          color: var(--text-color-2);
      }
  }

  .atmosphere-section {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid var(--border-color-2);

      &__title {
          font-size: 18px;
          font-weight: bold;
          letter-spacing: .02em;
          color: var(--text-color-1);
          padding: 0 12px;
      }

      &__lead {
          font-size: 13px;
          line-height: 1.5;
          color: var(--text-color-3);
          padding: 6px 12px 0;
      }
  }

  .atmosphere-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(440px, 1fr));
      gap: 6px 24px;
      margin-top: 10px;

      @media (max-width: 767px) {
          grid-template-columns: 1fr;
      }
  }

  .atmosphere-status {
      padding: 16px 12px;
      font-size: 14px;
      color: var(--text-color-3);
  }

  .atmosphere-register {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-top: 24px;
      padding: 16px 20px;
      border-radius: var(--border-radius-4);
      background-color: var(--bg-color-2);

      @media (max-width: 767px) {
          flex-direction: column;
          align-items: stretch;
      }

      &__body {
          flex: 1;
          min-width: 0;
      }

      &__title {
          font-size: 15px;
          font-weight: bold;
          color: var(--text-color-1);
      }

      &__text {
          margin-top: 6px;
          font-size: 13px;
          line-height: 1.6;
          color: var(--text-color-2);
      }
  }
</style>
