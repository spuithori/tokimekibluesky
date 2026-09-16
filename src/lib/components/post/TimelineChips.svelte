<script lang="ts">
  import Info from '@lucide/svelte/icons/info';
  import Languages from '@lucide/svelte/icons/languages';
  import AppWindow from '@lucide/svelte/icons/app-window';
  import {settings} from '$lib/stores';
  import {_} from "tokimeki-i18n";
  import LabelDetailModal from "$lib/components/post/LabelDetailModal.svelte";
  import Heart from '@lucide/svelte/icons/heart';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import Crown from '@lucide/svelte/icons/crown';
  import Gem from '@lucide/svelte/icons/gem';
  import { TOKIMEKI_LABELER_DID, getSupporterPlan } from '$lib/support/supporterLabels';

  function planOf(label: any) {
      return label?.label?.src === TOKIMEKI_LABELER_DID ? getSupporterPlan(label?.label?.val) : undefined;
  }

  interface Props {
    labels?: any[];
    langs?: string[];
    via?: string;
  }

  let { labels = [], langs = [], via = '' }: Props = $props();
  let isInfoOpen = $state(false);
  const ordered = $derived([...labels].sort((a, b) => (planOf(b)?.rank ?? 0) - (planOf(a)?.rank ?? 0)));
</script>

<ul class="timeline-chips">
  {#each ordered as label (label?.label?.src + label?.label?.val)}
    {@const plan = planOf(label)}
    <li class={['timeline-chips__item', plan && `timeline-chips__item--plan timeline-chips__item--${plan.id}`]}>
      {#if (plan?.id === 'supporter')}
        <Heart size={13} strokeWidth="2.5" />
      {:else if (plan?.id === 'sponsor')}
        <Sparkles size={13} strokeWidth="2.5" />
      {:else if (plan?.id === 'tokimeki-gold')}
        <Crown size={13} strokeWidth="2.5" />
      {:else if (plan?.id === 'tokimeki-platinum')}
        <Gem size={13} strokeWidth="2.5" />
      {/if}
      {#if (label?.source?.type === 'user' || label?.label?.src === 'did:plc:ar7c4by46qjdydhdevvrndac' || !label?.labelDef?.locales[0]?.name)}
        {$_('labeling_' + label.label?.val)}
      {:else}
        {label?.labelDef?.locales.find((locale: { lang: string; name: string }) => locale.lang === $settings.general.userLanguage)?.name ?? label?.labelDef?.locales[0]?.name}
      {/if}
    </li>
  {/each}

  {#if (labels.length)}
    <li class="timeline-chips__button">
      <button class="timeline-chips-button" onclick={() => {isInfoOpen = true}}>
        <Info size={16} color="var(--text-color-2)" />
      </button>
    </li>
  {/if}

  {#each langs as lang (lang)}
    <li class="timeline-chips__item timeline-chips__item--dev">
      <Languages size={13} />{lang}
    </li>
  {/each}

  {#if (via)}
    <li class="timeline-chips__item timeline-chips__item--dev">
      <AppWindow size={13} />{via}
    </li>
  {/if}
</ul>

{#if (isInfoOpen)}
  <LabelDetailModal labels={ordered} onclose={() => {isInfoOpen = false}}></LabelDetailModal>
{/if}

<style lang="postcss">
  .timeline-chips {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 4px;
      list-style: none;
      margin-bottom: 8px;

      &__item {
          color: var(--text-color-3);
          font-size: 13px;
          padding: 0 8px;
          border-radius: 12px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border-color-2);
          letter-spacing: .025em;

          &--dev {
              gap: 4px;
              font-family: var(--code-font, ui-monospace, monospace);
              letter-spacing: 0;
          }

          &--plan {
              gap: 4px;
              color: var(--plan-color);
              border: 1px solid var(--plan-color);
              background: var(--plan-bg, transparent);
          }

          &--supporter {
              --plan-color: #ec5f8c;
          }

          &--sponsor {
              --plan-color: #8c56d3;
          }

          &--tokimeki-gold {
              --plan-color: #c48a0a;
              --plan-bg: color-mix(in srgb, #f2b632 12%, transparent);
          }

          &--tokimeki-platinum {
              --plan-color: #5f7d96;
              --plan-bg: color-mix(in srgb, #9fb6c8 14%, transparent);
          }

          :global(.darkmode) &--supporter {
              --plan-color: #ff8fb3;
          }

          :global(.darkmode) &--sponsor {
              --plan-color: #b795f0;
          }

          :global(.darkmode) &--tokimeki-gold {
              --plan-color: #e9bd45;
          }

          :global(.darkmode) &--tokimeki-platinum {
              --plan-color: #a9c2d6;
          }
      }
  }

  .timeline-chips-button {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
          opacity: .7;
      }

      :global(svg) {
          display: block;
      }
  }
</style>
