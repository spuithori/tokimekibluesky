<script lang="ts">
  import { toast } from 'svelte-sonner';
  import { _ } from 'tokimeki-i18n';
  import { db } from '$lib/db';
  import { agent } from "$lib/stores";
  import { formatDate } from '$lib/dateFormat';
  import type { Draft } from '$lib/db';
  import { stateQuery } from "$lib/classes/dbState.svelte";
  import Trash2 from '@lucide/svelte/icons/trash-2';

  let { _agent = $agent, onuse, variant = 'modal' } = $props();

  let draftsQuery = stateQuery(
      () => {
          const did = _agent?.did?.();
          if (!did) return [];
          return db.drafts.where('owner').equals(did as string).reverse().toArray();
      },
      () => [],
  );
  const drafts = $derived(draftsQuery.current);

  async function use(draft: Draft) {
      try {
          onuse(draft);
          const id = await db.drafts.delete(draft.id);
      } catch (e) {
          toast.error($_('error') + ': ' + e);
      }
  }

  async function deleteDraft(draft: Draft) {
      try {
          const id = await db.drafts.delete(draft.id);
          toast.success($_('draft_delete_success'));
      } catch (e) {
          toast.error($_('error') + ': ' + e);
      }
    }
</script>

{#if variant !== 'hub' || drafts?.length}
  <div class="drafts" class:drafts--hub={variant === 'hub'} class:publish-drafts={variant === 'hub'}>
    {#if variant === 'hub'}
      <p class="drafts__heading">{$_('drafts')} ({drafts?.length ?? 0})</p>
    {/if}

    {#if (drafts)}
      {#each drafts as draft}
        <div class="drafts__item">
          <p class="drafts__date">{formatDate(draft.createdAt, 'yyyy-MM-dd HH:mm:ss')}</p>

          {#if draft?.replyRef?.data}
            <p class="drafts__reply">{$_('drafts_reply')}: @{draft.replyRef?.data.parent.author.handle} {draft.replyRef?.data.parent.record.text}</p>
          {/if}

          {#if draft?.replyRef?.parent}
            <p class="drafts__reply">{$_('drafts_reply')}: @{draft.replyRef?.parent.author.handle} {draft.replyRef?.parent.record.text}</p>
          {/if}

          {#if draft?.quotePost}
            <p class="drafts__reply">{$_('drafts_quote')}: {draft.quotePost?.record?.text || ''}</p>
          {/if}

          <p class="drafts__text">{draft.text}</p>

          {#if draft?.images?.length}
            <div class="drafts-images">
              {#each draft.images as image}
                <div class="drafts-images__item">
                  {#if (image.base64)}
                    <img src="{image.base64}" alt="">
                  {/if}
                </div>
              {/each}
            </div>
          {/if}

          <button class="drafts__button" onclick={() => {use(draft)}} aria-label="Use this."></button>

          <button class="drafts__delete" onclick={() => {deleteDraft(draft)}} aria-label="Delete">
              <Trash2 color="var(--danger-color)" size="20"></Trash2>
          </button>
        </div>
      {:else}
        <p class="drafts-nothing">{$_('drafts_nothing')}</p>
      {/each}
    {/if}
  </div>
{/if}

<style lang="postcss">
    .drafts {
        &__heading {
            color: var(--text-color-3);
            font-size: 13px;
            font-weight: bold;
            letter-spacing: .025em;
            padding: 4px 10px;
        }

        &__item {
            border-bottom: 1px solid var(--border-color-1);
            padding: 10px 50px 10px 10px;
            position: relative;

            &:hover {
                background-color: var(--bg-color-2);
            }
        }

        &__date {
            color: var(--text-color-3);
            font-size: 14px;
        }

        &__reply {
            text-overflow: ellipsis;
            overflow: hidden;
            white-space: nowrap;
            font-size: 14px;
        }

        &__button {
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            right: 0;
        }

        &__delete {
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 10;
            background-color: var(--bg-color-1);
            padding: 10px;
            border-radius: 6px;

            &:hover {
                background-color: var(--border-color-1);
            }
        }

        &__text {
            font-weight: bold;
        }

        &--hub {
            .drafts__item {
                border-radius: var(--border-radius-3);
                border-bottom: none;

                &:hover {
                    background-color: var(--bg-color-2);
                }
            }
        }
    }

    .drafts-images {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
        margin-top: 10px;
        max-width: 440px;

        &__item {
            width: 100%;
            height: 100%;
            aspect-ratio: 1 / 1;

            img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 6px;
            }
        }
    }

    .drafts-nothing {
        padding: 30px 0;
    }
</style>
