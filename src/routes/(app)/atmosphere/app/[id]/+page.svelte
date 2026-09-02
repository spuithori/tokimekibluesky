<script lang="ts">
  import { page } from '$app/state';
  import { _ } from 'tokimeki-i18n';
  import { findPreset, presetDetailView } from '$lib/atmosphere/presets';
  import ServiceDetail from '../../ServiceDetail.svelte';
  import DetailHeading from '../../DetailHeading.svelte';

  const preset = $derived(findPreset(page.params.id ?? ''));
</script>

<svelte:head>
  <title>{preset?.name ?? $_('atmosphere')} - TOKIMEKI</title>
</svelte:head>

<DetailHeading />

<div class="service">
  {#if preset}
    <ServiceDetail view={presetDetailView(preset, $_)} />
  {:else}
    <p class="service-status">{$_('atmosphere_detail_not_found')}</p>
  {/if}
</div>

<style lang="postcss">
  .service {
      padding: 24px 32px 40px;

      @media (max-width: 767px) {
          padding: 16px 12px 32px;
      }
  }

  .service-status {
      padding: 24px 0;
      font-size: 14px;
      color: var(--text-color-3);
  }
</style>
