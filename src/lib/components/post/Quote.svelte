<script lang="ts">
  import {postState} from "$lib/classes/postState.svelte";
  import {publishState} from "$lib/classes/publishState.svelte";
  import {modalState} from "$lib/classes/modalState.svelte";
  import {Quote} from "lucide-svelte";
  interface Props {
    post: any;
    embeddingDisabled?: boolean;
  }

  let { post, embeddingDisabled = false }: Props = $props();

  function handleClick() {
      postState.quote = post;
      postState.quotePulse = Symbol();
      publishState.show = true;
      modalState.isVideoModalOpen = false;
      modalState.isMediaModalOpen = false;
  }
</script>

<button class="timeline-reaction__item timeline-reaction__item--quote" onclick={handleClick} aria-label="Quote" disabled={embeddingDisabled}>
  <span class="timeline-reaction__icon">
    <Quote size="18" color="var(--timeline-reaction-like-icon-color)"></Quote>
  </span>
</button>

<style lang="postcss">
    .timeline-reaction__item {
        &:not(:disabled) {
            &:hover {
                @media (min-width: 768px) {
                    --timeline-reaction-like-icon-color: var(--timeline-reaction-like-icon-hover-color);

                    .timeline-reaction__icon::after {
                        background-color: var(--timeline-reaction-like-hover-bg-color);
                    }
                }
            }
        }

        &:disabled {
            opacity: .4;
        }
    }
</style>