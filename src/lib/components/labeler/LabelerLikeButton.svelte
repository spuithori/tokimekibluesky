<script lang="ts">
  import type { Agent } from "$lib/agent";
  import { onMount } from "svelte";
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
    did: string;
  }

  const { _agent, did }: Props = $props();

  /** string: URI, null: Not Liked, undefined: Loading / Unknown */
  let likeUri = $state<string | null | undefined>(undefined);
  let serviceRef = $state<
    | {
        uri: string;
        cid: string;
      }
    | undefined
  >(undefined);
  let likedCount = $state<number | undefined>(undefined);
  let isBusy = $state(false);
  let isModalOpen = $state(false);

  async function act() {
    if (isBusy || likeUri === undefined || serviceRef === undefined) {
      return;
    } else {
      isBusy = true;
      try {
        const { cid, uri } = serviceRef;
        const record = await _agent.setVote(cid, uri, likeUri ?? "");
        if (likeUri || !record?.uri || typeof record.uri !== "string") {
          likeUri = null;
          if (likedCount !== undefined) {
            likedCount--;
          }
        } else {
          likeUri = record.uri;
          if (likedCount !== undefined) {
            likedCount++;
          }
        }
      } finally {
        isBusy = false;
      }
    }
  }

  onMount(async () => {
    const service = await _agent.getLabelerServiceViewDetailed(did);
    if (!service) {
      likeUri = null;
      return;
    }
    likeUri = service.viewer?.like ?? null;
    serviceRef = {
      cid: service.cid,
      uri: service.uri,
    };
    likedCount = service.likeCount;
  });
</script>

{#if did !== "did:plc:ar7c4by46qjdydhdevvrndac"}
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

    {#if likedCount !== undefined}
      <button
        class="text-button liked-users-button"
        onclick={() => {
          isModalOpen = true;
        }}
      >
        {$_("liked_count", { count: likedCount.toString() })}
      </button>
    {/if}
  </div>

  {#if isModalOpen}
    <LikesModal
      uri={serviceRef?.uri}
      {_agent}
      onclose={() => {
        isModalOpen = false;
      }}
    />
  {/if}
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

      &:not(.active > *) {
        color: var(--text-color-3);
      }
    }
  }
</style>
