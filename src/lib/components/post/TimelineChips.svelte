<script lang="ts">
  import Info from '@lucide/svelte/icons/info';
  import Languages from '@lucide/svelte/icons/languages';
  import AppWindow from '@lucide/svelte/icons/app-window';
  import {settings} from '$lib/stores';
  import {_} from "tokimeki-i18n";
  import LabelDetailModal from "$lib/components/post/LabelDetailModal.svelte";

  interface Props {
    labels?: any[];
    langs?: string[];
    via?: string;
  }

  let { labels = [], langs = [], via = '' }: Props = $props();
  let isInfoOpen = $state(false);
</script>

<ul class="timeline-chips">
  {#each labels as label (label?.label?.src + label?.label?.val)}
    <li class="timeline-chips__item">
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
  <LabelDetailModal {labels} onclose={() => {isInfoOpen = false}}></LabelDetailModal>
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
