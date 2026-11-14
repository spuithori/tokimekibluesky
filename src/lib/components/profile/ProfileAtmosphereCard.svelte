<script lang="ts">
  import { _ } from 'tokimeki-i18n';
  import { intlRelativeTimeFormatState } from '$lib/classes/intlRelativeTimeFormatState.svelte';
  import { estimatedCardHeight, type CardData, type CardLink, type ProfileCardDef } from '$lib/atmosphere/profileCards';
  import GraduationCap from '@lucide/svelte/icons/graduation-cap';
  import GitBranch from '@lucide/svelte/icons/git-branch';
  import Newspaper from '@lucide/svelte/icons/newspaper';
  import Heart from '@lucide/svelte/icons/heart';
  import MessageCircle from '@lucide/svelte/icons/message-circle';
  import Star from '@lucide/svelte/icons/star';
  import EmbedPoll from '$lib/components/post/EmbedPoll.svelte';

  interface Props {
    def: ProfileCardDef;
    data: CardData | undefined;
    did: string;
    handle: string;
    _agent: any;
    height?: number;
  }

  let { def, data, did, handle, _agent, height = $bindable() }: Props = $props();

  const link = $derived(def.href({ did, handle }));
  const updated = $derived(ago(data?.updatedAt));
  const viewerDid = $derived(_agent?.did?.());
  const commits = $derived(data?.repos?.activity.reduce((sum, month) => sum + month.commits, 0) ?? 0);
  const peak = $derived(Math.max(1, ...(data?.repos?.activity.map((month) => month.commits) ?? [])));
  const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'short', timeZone: 'UTC' });
  const monthTitle = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', timeZone: 'UTC' });

  function ago(date: string | undefined): string {
      return date ? intlRelativeTimeFormatState.format({ laterDate: new Date(date) }) : '';
  }

  function target(to: CardLink) {
      return to.external ? { target: '_blank', rel: 'noopener noreferrer' } : {};
  }
</script>

<article
    class="atmos-card atmos-card--{def.shape}"
    style:min-height={data ? undefined : `${estimatedCardHeight(def.shape)}px`}
    bind:offsetHeight={height}
>
  <header class="atmos-card__head">
    <a class="atmos-card__title" href={link.href} {...target(link)}>
      {#if typeof def.icon === 'string'}
        <img class="atmos-card__icon" src={def.icon} alt="" width="20" height="20">
      {:else}
        <span class="atmos-card__glyph">
          {#if def.icon.glyph === 'study'}
            <GraduationCap size="18"></GraduationCap>
          {:else if def.icon.glyph === 'code'}
            <GitBranch size="18"></GitBranch>
          {:else}
            <Newspaper size="18"></Newspaper>
          {/if}
        </span>
      {/if}
      <span class="atmos-card__name">{data?.title ?? def.name}</span>
    </a>

    {#if data?.badgeKey}
      <span class={['atmos-card__badge', data.badgeKey === 'atmosphere_card_poll_closed' && 'atmos-card__badge--off']}>{$_(data.badgeKey)}</span>
    {:else if data?.repos?.total !== undefined}
      <span class="atmos-card__time">{data.repos.total.toLocaleString()} {$_('atmosphere_card_repos')}</span>
    {:else if updated}
      <span class="atmos-card__time">{updated}</span>
    {/if}
  </header>

  {#if data?.featured}
    {@const featured = data.featured}
    <a class="atmos-card__featured" href={featured.href} {...target(featured)}>
      {#if featured.image}
        <img class="atmos-card__cover" src={featured.image} alt="" loading="lazy" decoding="async">
      {/if}

      <span class="atmos-card__featured-body">
        <span class="atmos-card__featured-title">{featured.title}</span>

        {#if featured.description}
          <span class="atmos-card__featured-description">{featured.description}</span>
        {/if}

        {#if featured.likes !== undefined || featured.comments !== undefined}
          <span class="atmos-card__meta">
            {#if featured.likes !== undefined}
              <span class="atmos-card__count"><Heart size="12"></Heart>{featured.likes}</span>
            {/if}

            {#if featured.comments !== undefined}
              <span class="atmos-card__count"><MessageCircle size="12"></MessageCircle>{featured.comments}</span>
            {/if}
          </span>
        {/if}
      </span>
    </a>
  {/if}

  {#if data?.items?.length}
    <ul class={['atmos-card__list', data.featured && 'atmos-card__list--after']}>
      {#each data.items as item (item.href)}
        <li>
          <a class="atmos-card__row" href={item.href} {...target(item)}>
            <span class="atmos-card__row-title">{item.title}</span>

            {#if item.description}
              <span class="atmos-card__row-description">{item.description}</span>
            {/if}

            {#if item.date}
              <span class="atmos-card__row-date">{ago(item.date)}</span>
            {/if}
          </a>
        </li>
      {/each}
    </ul>
  {/if}

  {#if data?.repos}
    {@const repos = data.repos}
    {#if repos.activity.length}
      <figure class="atmos-card__activity">
        <figcaption class="atmos-card__activity-caption">{commits.toLocaleString()} {$_('atmosphere_card_commits')}</figcaption>

        <div class="atmos-card__bars" style:--months={repos.activity.length}>
          {#each repos.activity as month (month.start)}
            <span class="atmos-card__bar" style:height="{month.commits ? Math.max(6, Math.round((month.commits / peak) * 100)) : 0}%" title="{monthTitle.format(new Date(month.start))}: {month.commits.toLocaleString()}"></span>
          {/each}
        </div>

        <div class="atmos-card__months" style:--months={repos.activity.length} aria-hidden="true">
          {#each repos.activity as month (month.start)}
            <span>{monthLabel.format(new Date(month.start))}</span>
          {/each}
        </div>
      </figure>
    {/if}

    <ul class="atmos-card__repos">
      {#each repos.items as repo (repo.href)}
        <li>
          <a class="atmos-card__repo" href={repo.href} {...target(repo)}>
            <span class="atmos-card__repo-head">
              <span class="atmos-card__repo-name">{repo.title}</span>

              {#if repo.stars !== undefined}
                <span class="atmos-card__count"><Star size="12"></Star>{repo.stars.toLocaleString()}</span>
              {/if}
            </span>

            {#if repo.description}
              <span class="atmos-card__repo-description">{repo.description}</span>
            {/if}

            {#if repo.date}
              <span class="atmos-card__repo-meta">{$_('atmosphere_card_created', { time: ago(repo.date) })}</span>
            {/if}
          </a>
        </li>
      {/each}
    </ul>
  {/if}

  {#if data?.poll}
    {@const poll = data.poll}
    {#if poll.question}
      <a class="atmos-card__question" href={poll.href} {...target(poll)}>{poll.question}</a>
    {/if}

    {#if poll.result}
      {#key viewerDid}
        <EmbedPoll
            compact
            pollInfo={{ uri: poll.uri, did, rkey: poll.uri.split('/').pop() ?? '', options: poll.options.length }}
            {_agent}
            initial={poll.viewer === viewerDid ? poll.result as any : undefined}
        ></EmbedPoll>
      {/key}
    {:else}
      <a class="atmos-card__options" href={poll.href} {...target(poll)}>
        {#each poll.options as option, index (index)}
          <span class="atmos-card__option">
            {#if option.percent !== undefined}
              <span class="atmos-card__option-bar" style:width="{option.percent}%"></span>
            {/if}
            <span class="atmos-card__option-text">{option.text}</span>

            {#if option.percent !== undefined}
              <span class="atmos-card__option-percent">{option.percent}%</span>
            {/if}
          </span>
        {/each}
      </a>

      {#if poll.total !== undefined}
        <span class="atmos-card__poll-foot">{poll.total} {$_('poll_votes')}</span>
      {/if}
    {/if}
  {/if}

  {#if data?.thumbs}
    <div class="atmos-card__thumbs">
      {#each data.thumbs as thumb (thumb.href)}
        <a class="atmos-card__thumb" href={thumb.href} target="_blank" rel="noopener noreferrer">
          <img src={thumb.src} alt="" loading="lazy" decoding="async">
        </a>
      {/each}
    </div>
  {/if}

  {#if data?.stats}
    <dl class="atmos-card__stats">
      {#each data.stats as stat (stat.labelKey)}
        <div class="atmos-card__stat">
          <dd class="atmos-card__value">{stat.value}</dd>
          <dt class="atmos-card__label">{$_(stat.labelKey)}</dt>
        </div>
      {/each}
    </dl>
  {/if}
</article>

<style lang="postcss">
  .atmos-card {
      --card-gap: 12px;
      --card-inset: 8px;
      display: flex;
      flex-direction: column;
      gap: var(--card-gap);
      flex: none;
      padding: 14px 16px 16px;
      border-radius: var(--radius-card, 10px);
      background-color: var(--bg-color-2);
      container: atmos / inline-size;
      font-size: 14px;
      line-height: 1.5;

      a:hover {
          text-decoration: none;
      }

      &__head {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 24px;
      }

      &__title {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          color: var(--text-color-1);
          font-weight: bold;
      }

      &__icon {
          flex: none;
          width: 20px;
          height: 20px;
          border-radius: 5px;
      }

      &__glyph {
          flex: none;
          display: grid;
          place-content: center;
          width: 20px;
          height: 20px;
          color: var(--text-color-3);
      }

      &__name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
      }

      &__time,
      &__badge {
          margin-left: auto;
          flex: none;
          font-size: 12px;
          color: var(--text-color-3);
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
      }

      &__badge {
          padding: 0 8px;
          border-radius: var(--radius-round, 10px);
          background-color: var(--primary-color);
          color: var(--on-accent, var(--bg-color-1));
          font-weight: bold;
          line-height: 20px;

          &--off {
              background-color: var(--bg-color-1);
              color: var(--text-color-3);
              font-weight: normal;
          }
      }

      &__featured {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          color: var(--text-color-1);

          &:hover .atmos-card__featured-title {
              text-decoration: underline;
          }
      }

      &__cover {
          flex: none;
          width: 112px;
          aspect-ratio: 16 / 9;
          border-radius: var(--border-radius-3);
          object-fit: cover;
          background-color: var(--bg-color-1);
      }

      &__featured-body {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
      }

      &__featured-title {
          font-size: 15px;
          font-weight: bold;
          line-height: 1.45;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          overflow-wrap: anywhere;
      }

      &__featured-description {
          font-size: 13px;
          line-height: 1.5;
          color: var(--text-color-2);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          overflow-wrap: anywhere;
      }

      &__meta {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 12px;
          line-height: 18px;
          color: var(--text-color-3);
          font-variant-numeric: tabular-nums;
      }

      &__count {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          flex: none;
          font-size: 12px;
          color: var(--text-color-3);
          font-variant-numeric: tabular-nums;
      }

      &__list {
          display: flex;
          flex-direction: column;
          list-style: none;

          &--after {
              padding-top: var(--card-inset);
              border-top: 1px solid var(--border-color-2);
          }
      }

      &__row {
          display: flex;
          align-items: baseline;
          gap: 8px;
          min-width: 0;
          padding: 4px 0;
          color: var(--text-color-1);

          &:hover .atmos-card__row-title {
              text-decoration: underline;
          }
      }

      &__row-title {
          flex: 0 1 auto;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
      }

      &__row-description {
          flex: 1 1 0;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
          color: var(--text-color-3);
      }

      &__row-date {
          margin-left: auto;
          flex: none;
          font-size: 12px;
          color: var(--text-color-3);
          white-space: nowrap;
      }

      &__activity {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin: 0;
      }

      &__activity-caption {
          font-size: 12px;
          line-height: 18px;
          color: var(--text-color-3);
          font-variant-numeric: tabular-nums;
      }

      &__bars,
      &__months {
          display: grid;
          grid-template-columns: repeat(var(--months), minmax(0, 1fr));
          gap: 6px;
      }

      &__bars {
          align-items: end;
          height: 56px;
          border-bottom: 1px solid var(--border-color-1);
      }

      &__bar {
          border-radius: 3px 3px 0 0;
          background-color: var(--primary-color);
      }

      &__months {
          font-size: 11px;
          line-height: 14px;
          color: var(--text-color-3);
          text-align: center;
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
      }

      &__repos {
          display: flex;
          flex-direction: column;
          gap: var(--card-inset);
          list-style: none;
      }

      &__repo {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 10px 12px;
          border-radius: var(--border-radius-3);
          background-color: var(--bg-color-1);
          color: var(--text-color-1);

          &:hover .atmos-card__repo-name {
              text-decoration: underline;
          }
      }

      &__repo-head {
          display: flex;
          align-items: baseline;
          gap: 8px;
      }

      &__repo-name {
          flex: 1;
          min-width: 0;
          font-weight: bold;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
      }

      &__repo-description,
      &__repo-meta {
          font-size: 12px;
          line-height: 18px;
          color: var(--text-color-3);
      }

      &__repo-description {
          color: var(--text-color-2);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
      }

      &__question {
          color: var(--text-color-1);
          font-size: 15px;
          font-weight: bold;
          line-height: 1.45;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          overflow-wrap: anywhere;

          &:hover {
              text-decoration: underline;
          }
      }

      &__options {
          display: flex;
          flex-direction: column;
          gap: 6px;
          color: var(--text-color-1);
      }

      &__option {
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
          height: 36px;
          padding: 0 12px;
          border: 1px solid var(--border-color-1);
          border-radius: 6px;
          background-color: var(--bg-color-1);
          overflow: hidden;
      }

      &__option-bar {
          position: absolute;
          inset: 0 auto 0 0;
          background-color: color-mix(in srgb, var(--primary-color) 20%, transparent);
      }

      &__option-text {
          position: relative;
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
      }

      &__option-percent {
          position: relative;
          flex: none;
          font-weight: bold;
          font-variant-numeric: tabular-nums;
      }

      &__poll-foot {
          font-size: 13px;
          color: var(--text-color-3);
      }

      &__thumbs {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 6px;
      }

      &__thumb {
          display: block;
          min-width: 0;
          aspect-ratio: 1;
          border-radius: var(--border-radius-3);
          overflow: hidden;
          background-color: var(--bg-color-1);

          img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              display: block;
          }
      }

      &__stats {
          display: grid;
          grid-auto-flow: column;
          grid-auto-columns: minmax(0, 1fr);
          gap: var(--card-inset);
      }

      &__stat {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 10px 12px;
          border-radius: var(--border-radius-3);
          background-color: var(--bg-color-1);
      }

      &__value {
          font-size: 18px;
          font-weight: bold;
          line-height: 1.3;
          color: var(--text-color-1);
          font-variant-numeric: tabular-nums;
      }

      &__label {
          font-size: 12px;
          line-height: 18px;
          color: var(--text-color-3);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
      }
  }

  @container atmos (min-width: 480px) {
      .atmos-card__cover {
          width: 160px;
      }

      .atmos-card__featured-description {
          -webkit-line-clamp: 3;
      }
  }
</style>
