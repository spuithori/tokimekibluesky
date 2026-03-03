<script lang="ts">
  import { _ } from 'svelte-i18n';
  import {agent} from "$lib/stores";
  import Menu from "$lib/components/ui/Menu.svelte";
  import {goto} from "$app/navigation";
  import {getPostState} from "$lib/classes/postState.svelte";
  const postState = getPostState();

  interface Props {
    _agent?: any;
    starterPack: any;
    layout?: string;
  }

  let {
    _agent = $agent,
    starterPack,
    layout = 'default'
  }: Props = $props();

  let isMenuOpen = $state(false);

  function getPackHandle() {
    return starterPack.creator?.handle || starterPack.creator?.did;
  }

  function getPackRkey() {
    return starterPack.uri?.split('/').slice(-1)[0];
  }

  function handleEmbedClick() {
    const uri = `https://bsky.app/starter-pack/${getPackHandle()}/${getPackRkey()}`;
    postState.posts[postState.index].text = uri;
    postState.pulse = true;
    goto('/');
  }
</script>

<section class="starter-pack starter-pack--{layout}">
  <a class="starter-pack__link" href="/profile/{starterPack.creator?.did}/starterpack/{getPackRkey()}">
    <div class="starter-pack__content">
      <h3 class="starter-pack__title">{starterPack.record?.name || starterPack.name || ''}</h3>

      {#if starterPack.record?.description || starterPack.description}
        <p class="starter-pack__text">{starterPack.record?.description || starterPack.description}</p>
      {/if}

      <div class="starter-pack__meta">
        {#if starterPack.listItemCount != null}
          <span class="starter-pack__count">{$_('starter_pack_members_count', { values: { count: starterPack.listItemCount }})}</span>
        {/if}

        {#if starterPack.joinedAllTimeCount}
          <span class="starter-pack__count">{$_('starter_pack_joined_count', { values: { count: starterPack.joinedAllTimeCount }})}</span>
        {/if}
      </div>

      {#if starterPack.listItemsSample?.length}
        <div class="starter-pack__avatars">
          {#each starterPack.listItemsSample.slice(0, 7) as member}
            <div class="starter-pack__avatar-item">
              {#if member.subject?.avatar}
                <img src="{member.subject.avatar}" alt="{member.subject.displayName || member.subject.handle}">
              {:else}
                <div class="starter-pack__avatar-placeholder"></div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </a>

  {#if layout !== 'embed'}
    <Menu bind:isMenuOpen={isMenuOpen} buttonClassName="timeline-menu-toggle timeline-menu-toggle--feed">
      {#snippet content()}
        <ul class="timeline-menu-list">
          <li class="timeline-menu-list__item">
            <button class="timeline-menu-list__button" onclick={handleEmbedClick}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-quote"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>
              <span>{$_('quote_post')}</span>
            </button>
          </li>
        </ul>
      {/snippet}
    </Menu>
  {/if}
</section>

<style lang="postcss">
  .starter-pack {
    margin-bottom: 15px;
    border-radius: 10px;
    box-shadow: 0 0 10px var(--box-shadow-color-1);
    background-color: var(--bg-color-1);
    position: relative;

    &__link {
      display: block;
      text-decoration: none;
      color: inherit;
    }

    &__content {
      padding: 15px 10px;
    }

    &__title {
      font-size: 16px;
      letter-spacing: .05em;
      color: var(--text-color-1);
    }

    &__text {
      font-size: 14px;
      color: var(--text-color-2);
      margin-top: 4px;
    }

    &__meta {
      margin-top: 8px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 13px;
      color: var(--text-color-3);
    }

    &__creator {
      font-weight: 500;
    }

    &__count {
      &::before {
        content: '·';
        margin-right: 8px;
      }

      &:first-child::before {
        content: none;
      }
    }

    &__avatars {
      margin-top: 10px;
      display: flex;
      gap: 0;
    }

    &__avatar-item {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      overflow: hidden;
      border: 2px solid var(--bg-color-1);
      margin-left: -6px;
      background-color: var(--bg-color-2);

      &:first-child {
        margin-left: 0;
      }

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    &__avatar-placeholder {
      width: 100%;
      height: 100%;
      background-color: var(--border-color-1);
    }

    &--embed {
      margin-top: 8px;

      @container timeline-item (max-width: 345px) {
        margin-left: calc((var(--avatar-size) + var(--avatar-gap)) * -1);
      }
    }
  }
</style>
