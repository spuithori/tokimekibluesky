<script lang="ts">
  import LabelerSubscribeButton from "$lib/components/labeler/LabelerSubscribeButton.svelte";

  let { labeler } = $props();
</script>

<article class="labeler-user">
  <a href="/profile/{labeler.creator.handle}" class="labeler-user__avatar">
    {#if (labeler.creator?.avatar)}
      <img src="{labeler.creator.avatar}" alt="">
    {/if}
  </a>

  <div class="labeler-user__content">
    <h3 class="labeler-user__title">{labeler.creator.displayName}</h3>
    <p class="labeler-user__text">@{labeler.creator.handle}</p>
  </div>

  <div class="labeler-user__buttons">
    <LabelerSubscribeButton did={labeler.creator.did} size="ss"></LabelerSubscribeButton>
  </div>
</article>

<style lang="postcss">
    .labeler-user {
        display: grid;
        grid-template-columns: 64px 1fr 100px;
        align-items: center;
        gap: 8px;
        margin-bottom: 16px;

        &__avatar {
            display: block;
            width: 100%;
            height: 100%;
            aspect-ratio: 1 / 1;
            background-color: var(--primary-color);
            border-radius: var(--border-radius-4);
            overflow: hidden;

            img {
                width: 100%;
            }
        }

        &__title {
            font-size: 16px;
        }

        &__text {
            font-size: 14px;
            color: var(--text-color-3);
        }
    }
</style>