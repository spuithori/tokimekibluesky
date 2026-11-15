<script lang="ts">
  import type { Component } from 'svelte';
  import { _ } from 'tokimeki-i18n';
  import Globe from '@lucide/svelte/icons/globe';
  import Image from '@lucide/svelte/icons/image';
  import Users from '@lucide/svelte/icons/users';
  import Library from '@lucide/svelte/icons/library';
  import Plus from '@lucide/svelte/icons/plus';
  import Film from '@lucide/svelte/icons/film';
  import HeartHandshake from '@lucide/svelte/icons/heart-handshake';
  import Zap from '@lucide/svelte/icons/zap';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import UserCheck from '@lucide/svelte/icons/user-check';
  import AtSign from '@lucide/svelte/icons/at-sign';
  import Flame from '@lucide/svelte/icons/flame';
  import Moon from '@lucide/svelte/icons/moon';
  import { BUILDER_TEMPLATES } from '$lib/feedbuilder/feedBuilder.svelte';

  interface Props {
    onPick: (templateId: string) => void;
    onBlank: () => void;
  }
  let { onPick, onBlank }: Props = $props();

  const ICON: Record<string, { icon: Component; accent: 'pink' | 'peri' | 'mint' | 'sky' | 'cream' }> = {
    global:   { icon: Globe,    accent: 'sky' },
    photos:   { icon: Image,    accent: 'pink' },
    videos:   { icon: Film,     accent: 'sky' },
    following: { icon: UserCheck, accent: 'peri' },
    aboutMe:  { icon: AtSign,   accent: 'pink' },
    cleanHot: { icon: Flame,    accent: 'mint' },
    lateNight: { icon: Moon,    accent: 'cream' },
    friendsLiked: { icon: HeartHandshake, accent: 'pink' },
    trending: { icon: Zap, accent: 'mint' },
    forYou: { icon: Sparkles, accent: 'peri' },
    authors:  { icon: Users,    accent: 'peri' },
    collection: { icon: Library, accent: 'cream' }
  };
</script>

<div class="template-carousel">
  <p class="template-carousel__intro">
    {$_('tfeeds_src_tpl_intro')}
  </p>
  <ul class="template-carousel__list">
    {#each BUILDER_TEMPLATES as t (t.id)}
      {@const meta = ICON[t.id]}
      {@const Icon = meta?.icon}
      <li>
        <button
          type="button"
          class="template-carousel__card"
          data-accent={meta?.accent ?? 'peri'}
          onclick={() => onPick(t.id)}
        >
          {#if Icon}
            <span class="template-carousel__icon" aria-hidden="true">
              <Icon size={18} strokeWidth={1.8} />
            </span>
          {/if}
          <span class="template-carousel__text">
            <span class="template-carousel__title">{t.label}</span>
            <span class="template-carousel__desc">{t.description}</span>
          </span>
        </button>
      </li>
    {/each}
    <li>
      <button
        type="button"
        class="template-carousel__card template-carousel__card--blank"
        onclick={onBlank}
      >
        <span class="template-carousel__icon template-carousel__icon--blank" aria-hidden="true">
          <Plus size={18} strokeWidth={1.8} />
        </span>
        <span class="template-carousel__text">
          <span class="template-carousel__title">{$_('tfeeds_src_tpl_blank')}</span>
          <span class="template-carousel__desc">{$_('tfeeds_src_tpl_blank_desc')}</span>
        </span>
      </button>
    </li>
  </ul>
</div>

<style lang="postcss">
  .template-carousel {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);

    &__intro {
      margin: 0;
      color: var(--text-color-3);
      font-size: 12px;
      letter-spacing: 0.02em;
    }

    &__list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    &__card {
      all: unset;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      gap: var(--space-3);
      width: 100%;
      padding: var(--space-3) var(--space-4);
      background-color: var(--bg-color-2);
      border: 1px solid var(--border-color-2);
      border-radius: var(--radius-4);
      cursor: pointer;
      transition:
        background-color var(--duration-fast) var(--ease-out),
        border-color var(--duration-fast) var(--ease-out),
        box-shadow var(--duration-fast) var(--ease-out),
        transform var(--duration-fast) var(--ease-out);

      &:hover {
        background-color: var(--bg-color-1);
        border-color: color-mix(in srgb, var(--cyan-color) 30%, var(--border-color-1));
        box-shadow: var(--shadow-2);
        transform: translateY(-1px);
      }

      &:active {
        transform: translateY(0);
      }

      &:focus-visible {
        outline: none;
        border-color: color-mix(in srgb, var(--cyan-color) 55%, var(--border-color-1));
        box-shadow: 0 0 0 3px var(--cyan-color-soft);
      }

      &--blank {
        border-style: dashed;
        background-color: transparent;

        &:hover {
          background-color: var(--bg-color-2);
          border-style: solid;
        }
      }
    }

    &__icon {
      display: inline-flex;
      flex-shrink: 0;
      width: 36px;
      height: 36px;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-3);
      background-color: var(--bg-color-3);
      color: var(--text-color-2);
      transition:
        background-color var(--duration-fast) var(--ease-out),
        color var(--duration-fast) var(--ease-out);

      &--blank {
        background-color: transparent;
        border: 1px dashed var(--border-color-1);
        color: var(--text-color-3);
      }
    }

    [data-accent='pink']  > .template-carousel__icon { background-color: var(--color-pink-soft);  color: var(--color-primary-600); }
    [data-accent='peri']  > .template-carousel__icon { background-color: var(--color-peri-soft);  color: var(--primary-color); }
    [data-accent='mint']  > .template-carousel__icon { background-color: var(--color-mint-soft);  color: var(--primary-color); }
    [data-accent='sky']   > .template-carousel__icon { background-color: var(--color-sky-soft);   color: var(--primary-color); }
    [data-accent='cream'] > .template-carousel__icon { background-color: var(--color-cream-soft); color: var(--primary-color); }

    &__text {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    &__title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-color-1);
      letter-spacing: 0.01em;
    }

    &__desc {
      font-size: 12px;
      color: var(--text-color-3);
      line-height: 1.5;
    }

    &__card--blank &__title {
      color: var(--text-color-2);
    }
  }
</style>
