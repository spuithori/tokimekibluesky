<script lang="ts">
  import { _ } from 'tokimeki-i18n';
  import { settings } from '$lib/stores';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
  import Handshake from '@lucide/svelte/icons/handshake';
  import VolumeX from '@lucide/svelte/icons/volume-x';
  import Ban from '@lucide/svelte/icons/ban';
  import TimelineChips from '$lib/components/post/TimelineChips.svelte';
  import LabelDetailModal from '$lib/components/post/LabelDetailModal.svelte';
  import { labelDisplayName, labelSourceKey, type ProfileLabelView, type ProfileRelation } from '$lib/profile/labelView';

  interface Props {
    view: ProfileLabelView;
  }

  let { view }: Props = $props();
  let isDetailOpen = $state(false);

  const RELATION_TEXT: Record<ProfileRelation, string> = {
      followedBy: 'follows_you',
      muted: 'muting_this_user',
      blocking: 'blocking_this_user',
      blockedBy: 'blocked_by_this_user',
  };

  const alertNames = $derived(view.alerts.map((cause) => labelDisplayName(cause, $settings.general.userLanguage, $_)).join(' ・ '));
  const alertSources = $derived([...new Set(view.alerts.map(labelSourceKey))].map((key) => $_(key)).join(' ・ '));
</script>

{#if view.alerts.length}
  <button class="profile-alert" onclick={() => { isDetailOpen = true; }}>
    <TriangleAlert size="16" strokeWidth="2.5"></TriangleAlert>
    <span class="profile-alert__names">{alertNames}</span>
    <span class="profile-alert__source">{alertSources}</span>
  </button>
{/if}

{#if view.relations.length || view.informs.length}
  <div class="profile-chips">
    {#each view.relations as relation (relation)}
      <p class="profile-relationship-by">
        {#if relation === 'followedBy'}
          <Handshake size="16" color="var(--text-color-3)"></Handshake>
        {:else if relation === 'muted'}
          <VolumeX size="16" color="var(--text-color-3)"></VolumeX>
        {:else}
          <Ban size="16" color="var(--text-color-3)"></Ban>
        {/if}
        {$_(RELATION_TEXT[relation])}
      </p>
    {/each}

    {#if view.informs.length}
      <TimelineChips labels={view.informs}></TimelineChips>
    {/if}
  </div>
{/if}

{#if isDetailOpen}
  <LabelDetailModal labels={view.alerts} onclose={() => { isDetailOpen = false; }}></LabelDetailModal>
{/if}

<style lang="postcss">
  .profile-alert {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 2px 8px;
      width: 100%;
      padding: 6px 10px;
      margin-bottom: 8px;
      border-radius: var(--border-radius-3);
      background-color: color-mix(in srgb, var(--danger-color) 12%, transparent);
      color: var(--danger-color);
      font-size: 14px;
      font-weight: bold;
      line-height: 1.5;
      text-align: left;

      &:hover {
          opacity: .8;
      }

      &__source {
          color: var(--text-color-2);
          font-size: 13px;
          font-weight: normal;
      }
  }

  .profile-chips {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
      margin-bottom: 8px;

      :global(.timeline-chips) {
          margin-bottom: 0;
      }

      :global(.profile-relationship-by) {
          margin-top: 0;
      }
  }
</style>
