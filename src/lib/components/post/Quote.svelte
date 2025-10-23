<script lang="ts">
  import { _ } from 'svelte-i18n';
  import {publishState} from "$lib/classes/publishState.svelte";
  import {modalState} from "$lib/classes/modalState.svelte";
  import {Quote} from "lucide-svelte";
  import {getPostState} from "$lib/classes/postState.svelte";
  interface Props {
    post: any;
    embeddingDisabled?: boolean;
  }

  let { post, embeddingDisabled = false }: Props = $props();
  const postState = getPostState();

  function handleClick() {
      postState.posts[postState.index].quotePost = post;
      postState.pulse = true;
      publishState.show = true;
      modalState.isVideoModalOpen = false;
      modalState.isMediaModalOpen = false;
  }
</script>

<button class="timeline-reaction__item timeline-reaction__item--quote" onclick={handleClick} disabled={embeddingDisabled}>
  <span class="timeline-reaction__icon" aria-label={$_('quote')}>
    <Quote size="16" color="var(--timeline-reaction-like-icon-color)" absoluteStrokeWidth={true} strokeWidth="1.5"></Quote>
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