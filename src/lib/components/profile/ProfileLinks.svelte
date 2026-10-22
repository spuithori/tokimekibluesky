<script lang="ts">
  import Globe from '@lucide/svelte/icons/globe';
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
  import { SvelteSet } from 'svelte/reactivity';
  import { getLinkHost, linkIconSrc, type ProfileLink } from '$lib/profileLinks/rules';

  interface Props {
    links: ProfileLink[];
    did: string;
  }

  let { links, did }: Props = $props();

  const failedIcons = new SvelteSet<string>();
</script>

<ul class="profile-links">
  {#each links as link (link.url)}
    {@const iconSrc = linkIconSrc(link, did)}
    <li>
      <a class="profile-link" href={link.url} target="_blank" rel="noopener noreferrer" title={link.url}>
        {#if iconSrc && !failedIcons.has(iconSrc)}
          <img class="profile-link__icon" src={iconSrc} alt="" width="16" height="16" loading="lazy" onerror={() => failedIcons.add(iconSrc)}>
        {:else}
          <Globe size="16"></Globe>
        {/if}
        <span class="profile-link__label">{link.title || getLinkHost(link.url)}</span>
        <ArrowUpRight size="12" color="var(--text-color-3)"></ArrowUpRight>
      </a>
    </li>
  {/each}
</ul>

<style lang="postcss">
  .profile-links {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
      list-style: none;

      li {
          min-width: 0;
          max-width: 100%;
      }
  }

  .profile-link {
      display: flex;
      align-items: center;
      gap: 6px;
      max-width: 100%;
      padding: 6px 10px;
      border-radius: var(--radius-round, 9999px);
      background: var(--bg-color-1);
      color: var(--text-color-1);
      font-size: 13px;
      font-weight: bold;
      line-height: 1.2;
      text-decoration: none;

      &:hover {
          background: linear-gradient(var(--state-hover, var(--bg-color-3)) 0 0), var(--bg-color-1);
      }

      &__icon {
          flex-shrink: 0;
          width: 16px;
          height: 16px;
          border-radius: 3px;
          object-fit: contain;
      }

      &__label {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
      }

      :global(svg) {
          flex-shrink: 0;
      }
  }
</style>
