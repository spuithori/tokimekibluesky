<script lang="ts">
  import { page } from '$app/state';
  import { onDestroy } from 'svelte';
  import { _, locale } from 'tokimeki-i18n';
  import { toast } from 'svelte-sonner';
  import { env } from '$env/dynamic/public';
  import { agent } from '$lib/stores';
  import { fetchAtmosphereService, fetchListedServices, localizeService, serviceUri, toDetailView } from '$lib/atmosphere/registry';
  import { setServiceVisibility } from '$lib/atmosphere/manage';
  import ServiceDetail from '../../ServiceDetail.svelte';
  import DetailHeading from '../../DetailHeading.svelte';

  const adminDids = new Set((env.PUBLIC_ATMOSPHERE_ADMIN_DIDS ?? '').split(',').map((item) => item.trim()).filter(Boolean));

  const did = $derived(decodeURIComponent(page.params.did ?? ''));
  const rkey = $derived(page.params.rkey ?? '');
  const isAdmin = $derived(!!$agent && adminDids.has($agent.did() as string));

  let listedState = $state<'unknown' | 'listed' | 'unlisted'>('unknown');
  let toggling = $state(false);

  const listedPromise = $derived.by(() => {
      if (!isAdmin) return null;
      return fetchListedServices({ did }).then((rows) => {
          listedState = rows.some((row) => row.uri === serviceUri(did, rkey)) ? 'listed' : 'unlisted';
      }).catch(() => {
          listedState = 'unknown';
      });
  });

  async function toggleVisibility(visible: boolean) {
      if (!$agent || toggling) return;
      toggling = true;
      try {
          await setServiceVisibility($agent, serviceUri(did, rkey), visible);
          listedState = visible ? 'listed' : 'unlisted';
          toast.success(visible ? $_('atmosphere_unhide_done') : $_('atmosphere_hide_done'));
      } catch (e) {
          console.error(e);
          toast.error($_('atmosphere_form_error'));
      } finally {
          toggling = false;
      }
  }

  let controller = new AbortController();
  const entryPromise = $derived.by(() => {
      controller.abort();
      controller = new AbortController();
      return fetchAtmosphereService(did, rkey, controller.signal);
  });

  onDestroy(() => {
      controller.abort();
  });
</script>

<svelte:head>
  <title>{$_('atmosphere')} - TOKIMEKI</title>
</svelte:head>

<DetailHeading />

<div class="service">
  {#await entryPromise then entry}
    {#if entry}
      <ServiceDetail view={toDetailView(localizeService(entry, $locale))} />

      {#if isAdmin}
        {#await listedPromise then}
          <div class="service-admin">
            <p class="service-admin__label">
              {$_('atmosphere_admin_label')}
              {listedState === 'listed' ? $_('atmosphere_status_listed') : listedState === 'unlisted' ? $_('atmosphere_status_unlisted') : ''}
            </p>
            {#if listedState === 'listed'}
              <button class="button button--sm button--danger" type="button" disabled={toggling} onclick={() => toggleVisibility(false)}>{$_('atmosphere_hide')}</button>
            {:else if listedState === 'unlisted'}
              <button class="button button--sm button--border" type="button" disabled={toggling} onclick={() => toggleVisibility(true)}>{$_('atmosphere_unhide')}</button>
            {/if}
          </div>
        {/await}
      {/if}
    {:else}
      <p class="service-status">{$_('atmosphere_detail_not_found')}</p>
    {/if}
  {:catch}
    <p class="service-status">{$_('atmosphere_community_error')}</p>
  {/await}
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

  .service-admin {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 32px;
      padding: 12px 16px;
      border-radius: var(--border-radius-4);
      border: 1px dashed var(--border-color-1);

      &__label {
          flex: 1;
          font-size: 13px;
          color: var(--text-color-3);
      }
  }
</style>
