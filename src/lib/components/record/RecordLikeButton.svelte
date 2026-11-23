<script lang="ts">
  import type { Agent } from "$lib/agent";
  import LoadingSpinner from "../ui/LoadingSpinner.svelte";
  import { _ } from "tokimeki-i18n";
  import { settings } from "$lib/stores";
  import Heart from "@lucide/svelte/icons/heart";
  import HeartPlus from "@lucide/svelte/icons/heart-plus";
  import Star from "@lucide/svelte/icons/star";
  import StarPlus from "@lucide/svelte/icons/star-plus";
  import LikesModal from "../thread/LikesModal.svelte";

  interface Props {
    _agent: Agent;
    subject:
      | {
          haveLikedUri: string | null;
          haveLikedCount?: number;
          strongRef: {
            uri: string;
            cid: string;
          };
        }
      | undefined;
  }

  const { _agent, subject }: Props = $props();

  let likeCount = $state<number | undefined>(undefined);
  let likeUri = $state<string | null | undefined>(undefined);
  let isBusy = $state(false);
  let isModalOpen = $state(false);

  $effect(() => {
    likeUri = subject?.haveLikedUri;
    likeCount = subject?.haveLikedCount;
  });

  async function act() {
    if (isBusy || likeUri === undefined || !subject) {
      return;
    } else {
      isBusy = true;
      try {
        const { cid, uri } = subject.strongRef;
        const record = await _agent.setVote(cid, uri, likeUri ?? "");
        if (likeUri || !record?.uri || typeof record.uri !== "string") {
          likeUri = null;
          if (likeCount !== undefined) {
            likeCount--;
          }
        } else {
          likeUri = record.uri;
          if (likeCount !== undefined) {
            likeCount++;
          }
        }
      } finally {
        isBusy = false;
      }
    }
  }
</script>

<div class="labeler-buttons" class:active={!!likeUri}>
  <button
    class="button button--border button--sm button--labeler-like"
    onclick={act}
    aria-label={$_("like")}
    aria-pressed={!!likeUri}
    aria-busy={isBusy}
  >
    {#if isBusy || likeUri === undefined}
      <LoadingSpinner padding={0} size={20} />
    {:else if likeUri}
      {#if $settings?.design?.reactionMode === "superstar"}
        <Star fill="var(--timeline-reaction-liked-icon-color)" size="20" />
      {:else}
        <Heart fill="var(--timeline-reaction-liked-icon-color)" size="20" />
      {/if}
    {:else}
      {#if $settings?.design?.reactionMode === "superstar"}
        <StarPlus size="20" />
      {:else}
        <HeartPlus size="20" />
      {/if}
    {/if}
  </button>

  <button
    class="text-button liked-users-button"
    onclick={() => {
      isModalOpen = true;
    }}
  >
    {#if likeCount === undefined}
      {$_("liked_users")}
    {:else}
      {$_("liked_count", { count: likeCount.toString() })}
    {/if}
  </button>
</div>

{#if isModalOpen && subject}
  <LikesModal
    uri={subject.strongRef.uri}
    {_agent}
    onclose={() => {
      isModalOpen = false;
    }}
  />
{/if}

<style lang="postcss">
  .labeler-buttons {
    display: flex;
    column-gap: 6px;
    color: var(--text-color-3);
    background-color: var(--bg-color-1);
    border-radius: var(--radius-round, 18px);

    & .button--labeler-like {
      min-width: auto;
      aspect-ratio: 1 / 1;
      padding: 0;

      &[aria-pressed="true"] {
        color: var(--timeline-reaction-liked-icon-color);
      }
    }

    & .liked-users-button {
      font-size: 14px;
      padding-right: 12px;
      flex: 1;

      &:not(.active > *) {
        color: var(--text-color-3);
      }
    }
  }
</style>
