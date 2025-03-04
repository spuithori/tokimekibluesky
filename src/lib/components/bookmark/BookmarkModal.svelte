<script lang="ts">
  import { db } from '$lib/db';
  import { liveQuery } from 'dexie';
  import { agent } from '$lib/stores';
  import { toast } from 'svelte-sonner';
  import { _ } from 'svelte-i18n';
  import Modal from "$lib/components/ui/Modal.svelte";

  let { _agent = $agent, id, close } = $props();
  let bookmark = undefined;
  let name = $state('');
  let text = $state('');
  let bookmarks = liveQuery(() => db.bookmarks.toArray());

  $effect(() => {
      getData($bookmarks);
  })

  function getData(bookmarks) {
      if (!bookmarks) return false;
      bookmark = bookmarks.find(bookmark => bookmark.id === id);
      name = bookmark?.name ?? '';
      text = bookmark?.text ?? '';
  }

  async function save () {
      try {
          const id = await db.bookmarks.put({
              id: bookmark?.id || undefined,
              name: name,
              text: text,
              owner: _agent.did(),
              createdAt: Date.now(),
          })

          toast.success($_('bookmark_save_success'));

          close(false);
      } catch (e) {
          toast.error('Error: ' + e);
      }
  }

  async function remove () {
      if (id) {
          try {
              const bid = await db.bookmarks.delete(id);
              await db.feeds
                  .where('bookmark')
                  .equals(id)
                  .delete()
                  .then((deleteCount) => {
                      console.log(deleteCount + ' bookmarks deleted.')
                  });

              toast.success($_('bookmark_delete_success'));
              close(true, id);
          } catch (e) {
              toast.error('Error: ' + e);
          }
      } else {
          close(true);
      }
  }
</script>

<Modal title={$_('bookmark_add_management')} class="bookmark-modal" onclose={save}>
  <p class="modal-description">{$_('bookmark_add_description')}</p>

  <dl class="bookmark-modal-group">
    <dt class="bookmark-modal-group__name">
      <label for="bookmarkName">{$_('bookmark_name')}</label>
    </dt>

    <dd class="bookmark-modal-group__content">
      <div class="bookmark-modal-name">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
          <path id="edit-pencil" d="M9.84,2.96l3.2,3.2L3.2,16H0V12.8Zm1.12-1.12L12.8,0,16,3.2,14.16,5.04Z" fill="var(--text-color-1)"/>
        </svg>

        <input id="bookmarkName" type="text" class="bookmark-modal-name__input" bind:value={name}>
      </div>
    </dd>
  </dl>

  <dl class="bookmark-modal-group">
    <dt class="bookmark-modal-group__name">
      <label for="bookmarkDescription">{$_('bookmark_description')}</label>
    </dt>

    <dd class="bookmark-modal-group__content">
      <div class="bookmark-modal-name">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
          <path id="edit-pencil" d="M9.84,2.96l3.2,3.2L3.2,16H0V12.8Zm1.12-1.12L12.8,0,16,3.2,14.16,5.04Z" fill="var(--text-color-1)"/>
        </svg>

        <input id="bookmarkDescription" type="text" class="bookmark-modal-name__input" bind:value={text}>
      </div>
    </dd>
  </dl>

  <div class="bookmark-modal-close">
    <button class="button button--sm" onclick={save}>{$_('save_button')}</button>
    <button class="button button--sm button--border button--danger" onclick={remove}>{$_('remove')}</button>
  </div>
</Modal>

<style lang="postcss">
    .bookmark-modal-group {
        @media (max-width: 767px) {
            margin-bottom: 20px;
        }

        &__name {
            font-size: 14px;
            margin-bottom: 6px;
        }

        &__content {

        }

        &--name {
            margin-bottom: 30px;

            @media (max-width: 767px) {
                margin-bottom: 20px;
            }
        }

        &__input {
            border: 1px solid var(--border-color-1);
            border-radius: 4px;
            height: 40px;
            padding: 0 10px;
            width: 100%;
            background-color: var(--bg-color-2);
            color: var(--text-color-1);
        }
    }

    .bookmark-modal-name {
        position: relative;
        border: 1px solid var(--border-color-1);
        border-radius: 4px;
        height: 40px;
        padding: 0 10px;
        display: flex;
        gap: 10px;
        align-items: center;
        margin-bottom: 10px;
        overflow: hidden;

        &__input {
            color: var(--text-color-1);
        }

        &:focus-within {
            border-color: var(--text-color-1);
        }

        svg {
            flex-shrink: 0;
        }
    }

    .bookmark-modal-close {
        text-align: center;
        margin-top: 20px;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 20px;
    }
</style>