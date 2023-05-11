<script lang="ts">
  import TimelineItem from "../../../../TimelineItem.svelte";
  import { afterUpdate } from "svelte";
  import {_} from "svelte-i18n";

  export let feeds = [];
  export let depth = 0;
  let item;
  let scrolled = false;

  afterUpdate(() => {
      if (item && item.dataset.depth === '0') {
          const scroll = item.getBoundingClientRect().top + window.pageYOffset;
          scrollTo(0, scroll - 70);
          scrolled = true;
      }
  });
</script>

<div class="thread">
  {#each feeds as data (data)}
    {#if (!data.notFound)}
      {#if (data.parent)}
        <div class="thread-parent">
          <svelte:self feeds={[data.parent]} depth={depth + 1}></svelte:self>
        </div>
      {/if}

      <div class="thread-item" data-depth={depth} bind:this={item}>
        {#if (!data.blocked)}
          <TimelineItem data={data} isSingle={true} let:likes={likes}>
            <details class="likes-wrap" slot="likes">
              <summary class="likes-heading">
                {#if (data.post.record.via)}
                  <span class="timeline-via">via {data.post.record.via}</span>
                {/if}
                {$_('liked_users')}

                <svg xmlns="http://www.w3.org/2000/svg" width="14.814" height="8.821" viewBox="0 0 14.814 8.821">
                  <path id="パス_27" data-name="パス 27" d="M4393.408,794.858l6.7,6.7,6.7-6.7" transform="translate(-4392.701 -794.151)" fill="none" stroke="var(--text-color-3)" stroke-width="2"/>
                </svg>
              </summary>

              <div class="likes">
                {#if (likes?.likes.length)}
                  {#each likes.likes as like }
                    {#if (!like.actor.viewer?.muted)}
                      <div class="likes__item">
                        <div class="likes__avatar">
                          {#if (like.actor.avatar)}
                            <img src="{ like.actor.avatar }" alt="">
                          {/if}
                        </div>

                        <p class="likes__text"><a
                            href="/profile/{ like.actor.handle }">{ like.actor.displayName || like.actor.handle }</a></p>
                      </div>
                    {/if}
                  {/each}
                {/if}
              </div>
            </details>
          </TimelineItem>
        {:else}
          <p class="thread-blocked">{$_('error_get_posts_because_blocked_or_blocking')}</p>
        {/if}
      </div>

      {#if (data.replies?.length)}
        <div class="thread-replies">
          <svelte:self feeds={data.replies} depth={depth + 1}></svelte:self>
        </div>
      {/if}
    {/if}
  {/each}
</div>

<style lang="postcss">
  .thread {
      position: relative;
  }

  .thread-item {
      &[data-depth='0'] {
          margin-left: -20px;
          margin-right: -20px;
          padding-left: 20px;
          padding-right: 20px;
          background-color: var(--bg-color-2);
      }
  }

  .thread-replies {
      margin-left: 20px;
  }

  .thread-parent {
      position: relative;
  }

  .thread-parent::before {
      content: '';
      position: absolute;
      width: 2px;
      top: 20px;
      bottom: -20px;
      left: 29px;
      background-color: var(--border-color-1);
  }

  .thread-blocked {
      padding: 10px;
  }
</style>
