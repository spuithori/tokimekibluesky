<script lang="ts">
  import { _ } from "tokimeki-i18n";
  import Modal from "../ui/Modal.svelte";
  import Newspaper from "@lucide/svelte/icons/newspaper";
  import ProfileCardWrapper from "../../../routes/(app)/ProfileCardWrapper.svelte";
  import type { Agent } from "$lib/agent";
  import FeedSubscribeButton from "./FeedSubscribeButton.svelte";
  import RecordLikeButton from "../record/RecordLikeButton.svelte";
  import type { GeneratorView } from "$lib/types/atproto";
  import Flag from "@lucide/svelte/icons/flag";
  import { reportModal } from "$lib/stores";
  import Share2 from "@lucide/svelte/icons/share-2";
  import ExternalLink from "@lucide/svelte/icons/external-link";
  import { getPostState } from "$lib/classes/postState.svelte";
  import Quote from "@lucide/svelte/icons/quote";
  import { isDid } from "$lib/explorer/values";
  import SquarePlus from "@lucide/svelte/icons/square-plus";
  import SquareCheck from "@lucide/svelte/icons/square-check";
  import { addColumnWithIcon } from "$lib/addColumnWithIcon";
  import { toast } from "svelte-sonner";
  import { getColumnState } from "$lib/classes/columnState.svelte";
  import { defaultDeckSettings } from "../deck/defaultDeckSettings";

  interface Props {
    _agent: Agent;
    feed: GeneratorView;
    onClose: () => void;
    subscribed: boolean;
  }
  let { _agent, feed, onClose, subscribed }: Props = $props();

  let columnAdded = $state(false);

  const columnState = getColumnState();
  const postState = getPostState();
</script>

<Modal title={$_("about_this_feed")} onclose={onClose}>
  <article class="about-feed">
    <div class="about-feed__content">
      <div class="about-feed__head">
        <hgroup class="about-feed__title">
          <h3 class="about-feed__header">
            <span class="about-feed__avatar">
              {#if feed.avatar}
                <img
                  class="about-feed__avatar-image"
                  src={feed.avatar}
                  alt=""
                  width="48px"
                />
              {:else}
                <span class="about-feed__fallback-avatar" aria-hidden="true">
                  <Newspaper />
                </span>
              {/if}
            </span>
            <span class="about-feed__name">{feed.displayName}</span>
          </h3>
          <p class="about-feed__creator">
            {$_("author")}:
            <ProfileCardWrapper {_agent} handle={feed.creator.handle}>
              <a href={`/profile/${encodeURIComponent(feed.creator.did)}`}>
                @{feed.creator.handle}
              </a>
            </ProfileCardWrapper>
          </p>
        </hgroup>

        <div class="about-feed__actions">
          <span class="about-feed__action about-feed__action--subscribe">
            <FeedSubscribeButton
              {_agent}
              {feed}
              {subscribed}
              size="sm"
              withIcon
            />
          </span>
          <span class="about-feed__action about-feed__action--add">
            <button
              class="button button--sm about-feed__action-button"
              onclick={() => {
                if (columnAdded) {
                  return;
                }
                addColumnWithIcon(
                  columnState,
                  {
                    algorithm: {
                      algorithm: feed.uri,
                      avatar: feed.avatar,
                      name: feed.displayName,
                      type: "custom",
                    },
                    data: {},
                    did: _agent.did(),
                    id: crypto.randomUUID(),
                    settings: defaultDeckSettings,
                    style: "default",
                    handle: _agent.handle(),
                  },
                  feed.description,
                );
                toast.success($_("column_added"));
                columnAdded = true;
              }}
              aria-pressed={columnAdded}
            >
              {#if columnAdded}
                <SquareCheck />
              {:else}
                <SquarePlus />
              {/if}
              {$_("feed_quick_add")}
            </button>
          </span>
          <span class="about-feed__action about-feed__action--like">
            <RecordLikeButton
              {_agent}
              subject={{
                haveLikedUri: feed.viewer?.like ?? null,
                haveLikedCount: feed.likeCount,
                strongRef: {
                  cid: feed.cid,
                  uri: feed.uri,
                },
              }}
            />
          </span>
        </div>
      </div>

      {#if feed.description}
        <p class="about-feed__description">
          {feed.description}
        </p>
      {/if}
    </div>

    <div class="about-feed__subactions">
      {#if isDid(feed.creator.did)}
        <button
          class="button button--border button--sm about-feed__subaction about-feed__share"
          onclick={() => {
            navigator.share({
              url: `https://bsky.app/profile/${feed.creator.did}/feed/${encodeURIComponent(feed.uri.split("/").pop()!)}`,
              text: feed.displayName,
            });
          }}
        >
          <Share2 />
          {$_("share")}
        </button>
      {/if}

      <button
        class="button button--border button--sm about-feed__subaction about-feed__post"
        onclick={() => {
          if (postState.posts) {
            postState.posts[postState.index].quotePost = feed;
            postState.requestOpen();
            onClose();
          }
        }}
      >
        <Quote />
        {$_("embed_feed_button")}
      </button>

      {#if isDid(feed.creator.did)}
        <a
          class="button button--border button--sm about-feed__subaction about-feed__social-app"
          href="https://bsky.app/profile/{feed.creator
            .did}/feed/{encodeURIComponent(feed.uri.split('/').pop()!)}"
          target="_blank"
        >
          <ExternalLink />
          {$_("open_social_app")}
        </a>
      {/if}

      <button
        class="button button--border button--sm about-feed__subaction about-feed__report"
        onclick={() => {
          $reportModal = {
            open: true,
            data: { type: "feed", uri: feed.uri, cid: feed.cid || "" },
          };
        }}
      >
        <Flag />
        {$_("report")}
      </button>
    </div>
  </article>
</Modal>

<style>
  .about-feed {
    display: grid;
    row-gap: 16px;
    border-radius: var(--feed-about-border-radius, var(--border-radius-5));

    &__content {
      display: grid;
      row-gap: 16px;
      padding: 16px;
      background-color: var(--bg-color-2);
      border-radius: var(
        --feed-description-border-radius,
        calc(var(--feed-about-border-radius, var(--border-radius-5) - 8px))
      );
    }

    &__head {
      display: grid;
      row-gap: 8px;
      justify-items: center;
    }

    &__title {
      display: grid;
      grid-template:
        "avatar name   " auto
        "avatar creator" 24px /
        auto 1fr;
      align-items: center;
      width: min(90%, 640px);
    }

    &__header {
      display: grid;
      grid-template-rows: subgrid;
      grid-template-columns: subgrid;
      grid-area: avatar-start / avatar-start / avatar-end / name-end;
    }

    &__avatar {
      display: grid;
      grid-area: avatar;
      align-self: center;
      justify-self: center;
      margin: 0 8px;
      width: 48px;
      aspect-ratio: 1 / 1;
      border-radius: var(--feed-avatar-border-radius, var(--border-radius-2));
    }

    &__avatar-image {
      border: 1px solid var(--border-color-1);
      border-radius: inherit;
    }

    &__fallback-avatar {
      display: grid;
      align-items: center;
      justify-items: center;
      border: solid 2px var(--primary-color);
      color: var(--primary-color);
      border-radius: inherit;
    }

    &__name {
      grid-area: name;
    }

    &__creator {
      grid-area: creator;
    }

    &__actions {
      display: flex;
      flex-wrap: wrap;
      row-gap: 8px;
      column-gap: 8px;
      width: min(90%, 640px);
    }

    &__action {
      &--subscribe,
      &--add {
        flex: 1 1 auto;
        display: grid;
      }
    }

    &__action-button {
      display: flex;
      column-gap: 4px;
    }

    &__description {
      justify-self: stretch;
      font-size: 14px;
      white-space: pre-wrap;
      line-height: 1.7;
    }

    &__subactions {
      display: flex;
      flex-wrap: wrap;
      column-gap: 8px;
      row-gap: 8px;
    }

    &__subaction {
      display: flex;
      column-gap: 4px;
      white-space: pre;
    }

    &__share,
    &__post {
      flex: 2 1 auto;
    }

    &__social-app {
      flex: 1 1 auto;
    }

    &__report {
      border-color: var(--border-color-1);
      color: var(--text-color-3);
    }
  }
</style>
