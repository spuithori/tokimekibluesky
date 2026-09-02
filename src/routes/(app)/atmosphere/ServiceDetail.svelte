<script lang="ts">
  import SquareArrowOutUpRight from '@lucide/svelte/icons/square-arrow-out-up-right';
  import { _ } from 'tokimeki-i18n';
  import { ATMOSPHERE_SERVICE_COLLECTION, type DetailView } from '$lib/atmosphere/registry';

  let { view }: { view: DetailView } = $props();

  const host = $derived.by(() => {
      try {
          return new URL(view.url).host;
      } catch {
          return view.url;
      }
  });

  function categoryLabel(category: string): string {
      const key = `atmosphere_category_${category}`;
      const label = $_(key);
      return label === key ? category : label;
  }
</script>

<header class="service-header">
  {#if view.iconUrl}
    <img class="service-header__icon" src={view.iconUrl} alt="" width="112" height="112" decoding="async" referrerpolicy="no-referrer">
  {:else}
    <span class="service-header__icon service-header__icon--fallback" aria-hidden="true">{[...view.name][0] ?? ''}</span>
  {/if}

  <div class="service-header__body">
    <h2 class="service-header__name">{view.name}</h2>
    {#if view.tagline}
      <p class="service-header__tagline">{view.tagline}</p>
    {/if}
    <p class="service-header__meta">
      {#if view.developerLabel && view.developerHref}
        <a class="service-header__developer" href={view.developerHref}>{view.developerLabel}</a>
      {/if}
      {#if view.category}
        <span class="service-header__category">{categoryLabel(view.category)}</span>
      {/if}
    </p>
  </div>

  <a class="service-header__open" href={view.url} target="_blank" rel="noopener noreferrer nofollow">
    {$_('atmosphere_open')}
    <SquareArrowOutUpRight size="16" />
  </a>
</header>

{#if view.screenshots.length}
  <section class="service-section">
    <h3 class="service-section__title">{$_('atmosphere_detail_screenshots')}</h3>
    <div class="service-shots">
      {#each view.screenshots as shot, index (shot.url)}
        <figure class="service-shots__item">
          <img
            class="service-shots__image"
            src={shot.url}
            alt={shot.alt}
            width={shot.width ?? undefined}
            height={shot.height ?? undefined}
            style:aspect-ratio={shot.width && shot.height ? `${shot.width} / ${shot.height}` : null}
            loading={index < 2 ? 'eager' : 'lazy'}
            decoding="async"
            referrerpolicy="no-referrer"
          >
        </figure>
      {/each}
    </div>
  </section>
{/if}

<section class="service-section">
  <h3 class="service-section__title">{$_('atmosphere_detail_description')}</h3>
  <p class="service-description">{view.description}</p>
</section>

<section class="service-section">
  <h3 class="service-section__title">{$_('atmosphere_detail_information')}</h3>
  <dl class="service-info">
    <dt class="service-info__name">{$_('atmosphere_detail_website')}</dt>
    <dd class="service-info__value"><a href={view.url} target="_blank" rel="noopener noreferrer nofollow">{host}</a></dd>

    {#if view.developerLabel && view.developerHref}
      <dt class="service-info__name">{$_('atmosphere_detail_developer')}</dt>
      <dd class="service-info__value"><a href={view.developerHref}>{view.developerLabel}</a></dd>
    {/if}

    {#if view.recordHref}
      <dt class="service-info__name">{$_('atmosphere_detail_record')}</dt>
      <dd class="service-info__value"><a href={view.recordHref}>{ATMOSPHERE_SERVICE_COLLECTION}</a></dd>
    {/if}
  </dl>
</section>

<style lang="postcss">
  .service-header {
      display: grid;
      grid-template-columns: 112px 1fr auto;
      align-items: center;
      gap: 24px;

      @media (max-width: 767px) {
          grid-template-columns: 80px 1fr;
          gap: 16px;
      }

      &__icon {
          width: 112px;
          height: 112px;
          border-radius: 26px;
          object-fit: cover;
          background-color: var(--bg-color-3);
          box-shadow: inset 0 0 0 1px var(--border-color-2);

          @media (max-width: 767px) {
              width: 80px;
              height: 80px;
              border-radius: 19px;
          }

          &--fallback {
              display: grid;
              place-content: center;
              font-size: 44px;
              font-weight: bold;
              color: var(--text-color-3);
          }
      }

      &__body {
          min-width: 0;
      }

      &__name {
          font-size: 26px;
          font-weight: bold;
          line-height: 1.25;
          letter-spacing: .02em;
          color: var(--text-color-1);

          @media (max-width: 767px) {
              font-size: 20px;
          }
      }

      &__tagline {
          margin-top: 4px;
          font-size: 15px;
          line-height: 1.5;
          color: var(--text-color-2);
      }

      &__meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          font-size: 13px;
      }

      &__developer {
          color: var(--primary-color);
      }

      &__category {
          padding: 2px 10px;
          border-radius: 999px;
          background-color: var(--bg-color-3);
          color: var(--text-color-3);
          font-size: 12px;
      }

      &__open {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 40px;
          padding: 0 22px;
          border-radius: 999px;
          background-color: var(--primary-color);
          color: var(--bg-color-1);
          font-size: 14px;
          font-weight: bold;
          text-decoration: none;
          white-space: nowrap;

          &:hover {
              text-decoration: none;
              opacity: .85;
          }

          @media (max-width: 767px) {
              grid-column: 1 / -1;
              justify-content: center;
          }
      }
  }

  .service-section {
      margin-top: 32px;

      &__title {
          font-size: 18px;
          font-weight: bold;
          letter-spacing: .02em;
          color: var(--text-color-1);
          margin-bottom: 12px;
      }
  }

  .service-shots {
      display: flex;
      gap: 12px;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      padding-bottom: 8px;
      margin: 0 -32px;
      padding-left: 32px;
      padding-right: 32px;
      -webkit-overflow-scrolling: touch;

      @media (max-width: 767px) {
          margin: 0 -12px;
          padding-left: 12px;
          padding-right: 12px;
      }

      &__item {
          flex-shrink: 0;
          scroll-snap-align: start;
          margin: 0;
      }

      &__image {
          display: block;
          height: 380px;
          width: auto;
          max-width: 80vw;
          border-radius: var(--border-radius-4);
          background-color: var(--bg-color-3);
          box-shadow: inset 0 0 0 1px var(--border-color-2);

          @media (max-width: 767px) {
              height: 260px;
          }
      }
  }

  .service-description {
      font-size: 14px;
      line-height: 1.75;
      color: var(--text-color-2);
      white-space: pre-line;
      overflow-wrap: anywhere;
      max-width: 760px;
  }

  .service-info {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 8px 24px;
      font-size: 13px;

      &__name {
          color: var(--text-color-3);
      }

      &__value {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;

          a {
              color: var(--primary-color);
          }
      }
  }
</style>
