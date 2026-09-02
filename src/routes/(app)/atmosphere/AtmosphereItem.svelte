<script lang="ts">
  import { _ } from 'tokimeki-i18n';

  interface Props {
    name: string;
    description: string;
    url: string;
    href: string;
    icon?: string | null;
    category?: string | null;
  }

  let { name, description, url, href, icon = null, category = null }: Props = $props();

  const categoryLabel = $derived.by(() => {
      if (!category) return '';
      const key = `atmosphere_category_${category}`;
      const label = $_(key);
      return label === key ? category : label;
  });

  const host = $derived.by(() => {
      try {
          return new URL(url).host;
      } catch {
          return '';
      }
  });
  const initial = $derived([...name][0] ?? '');
</script>

<article class="atmos-app">
  {#if icon}
    <img class="atmos-app__icon" src={icon} alt="" width="64" height="64" loading="lazy" decoding="async" referrerpolicy="no-referrer">
  {:else}
    <span class="atmos-app__icon atmos-app__icon--fallback" aria-hidden="true">{initial}</span>
  {/if}

  <div class="atmos-app__body">
    <h4 class="atmos-app__name">{name}</h4>
    <p class="atmos-app__meta">
      {#if categoryLabel}
        <span class="atmos-app__category">{categoryLabel}</span>
        <span class="atmos-app__sep" aria-hidden="true">·</span>
      {/if}
      <span class="atmos-app__host">{host}</span>
    </p>
    <p class="atmos-app__desc">{description}</p>
  </div>

  <a class="atmos-app__detail" {href} aria-label={name}></a>

  <a class="atmos-app__open" href={url} target="_blank" rel="noopener noreferrer nofollow" aria-label="{name} - {$_('atmosphere_open')}">{$_('atmosphere_open')}</a>
</article>

<style lang="postcss">
  .atmos-app {
      position: relative;
      display: grid;
      grid-template-columns: 64px minmax(0, 1fr) auto;
      align-items: center;
      gap: 16px;
      padding: 14px 16px 14px 12px;

      @media (max-width: 767px) {
          grid-template-columns: 56px minmax(0, 1fr) auto;
          gap: 12px;
          padding: 12px 10px;
      }
      border-radius: var(--border-radius-4);
      transition: background-color .15s linear;

      &:hover {
          background-color: var(--bg-color-2);

          .atmos-app__name {
              color: var(--primary-color);
          }
      }

      &__icon {
          width: 64px;
          height: 64px;
          border-radius: 15px;

          @media (max-width: 767px) {
              width: 56px;
              height: 56px;
              border-radius: 13px;
          }
          object-fit: cover;
          background-color: var(--bg-color-3);
          box-shadow: inset 0 0 0 1px var(--border-color-2);

          &--fallback {
              display: grid;
              place-content: center;
              font-size: 28px;
              font-weight: bold;
              color: var(--text-color-3);
          }
      }

      &__body {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
      }

      &__name {
          font-size: 15px;
          font-weight: bold;
          line-height: 1.35;
          letter-spacing: .01em;
          color: var(--text-color-1);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
      }

      &__meta {
          font-size: 12px;
          line-height: 1.5;
          color: var(--text-color-3);
          overflow-wrap: anywhere;
      }

      &__category {
          color: var(--text-color-2);
      }

      &__sep {
          margin: 0 5px;
      }

      &__desc {
          margin-top: 2px;
          font-size: 13px;
          line-height: 1.5;
          color: var(--text-color-2);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          overflow-wrap: anywhere;
      }

      &__detail {
          position: absolute;
          inset: 0;
          border-radius: inherit;
      }

      &__open {
          position: relative;
          z-index: 1;
          display: grid;
          place-content: center;
          min-width: 60px;
          height: 32px;
          padding: 0 14px;
          border-radius: 999px;
          background-color: var(--bg-color-3);
          color: var(--primary-color);
          font-size: 13px;
          font-weight: bold;
          letter-spacing: .02em;
          text-decoration: none;

          &:hover {
              text-decoration: none;
              background-color: var(--border-color-1);
          }
      }
  }
</style>
