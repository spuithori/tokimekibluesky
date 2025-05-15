<script lang="ts">
  import { agent } from '$lib/stores';
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { _ } from 'svelte-i18n';
  import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
  import CloudBookmarkMenu from "$lib/components/bookmark/CloudBookmarkMenu.svelte";
  import Modal from "$lib/components/ui/Modal.svelte";

  let { _agent = $agent, id, close } = $props();
  let name = $state('');
  let text = $state('');
  let loading = $state(false);

  async function save () {
      try {
          const res = await fetch(`${await _agent.getPdsUrl()}/xrpc/tech.tokimeki.bookmark.addBookmark`, {
              method: 'POST',
              body: JSON.stringify({
                  bookmark: {
                      id: id || undefined,
                      owner: _agent.did() as string,
                      name: name,
                      text: text,
                  }
              }),
              headers: {
                  'atproto-proxy': 'did:web:api.tokimeki.tech#tokimeki_api',
                  Authorization: 'Bearer ' + _agent.getToken(),
                  'Content-Type': 'application/json'
              }
          })

          if (res.status !== 200) {
              throw new Error('failed to save Cloud Bookmark');
          }

          toast.success($_('bookmark_save_success'));
          close(false);
      } catch (e) {
          toast.error('Error: ' + e);
      }
  }

  async function remove () {
      close(false);
  }

  onMount(async () => {
      if (id) {
          loading = true;

          try {
              const res = await fetch(`${await _agent.getPdsUrl()}/xrpc/tech.tokimeki.bookmark.getBookmark?owner=${_agent.did() as string}&id=${id}`, {
                  method: 'GET',
                  headers: {
                      'atproto-proxy': 'did:web:api.tokimeki.tech#tokimeki_api',
                      Authorization: 'Bearer ' + _agent.getToken(),
                      'Content-Type': 'application/json'
                  }
              })

              if (res.status !== 200) {
                  throw new Error('failed to get Cloud Bookmark');
              }

              const json = await res.json();

              if (json?.bookmark) {
                  name = json.bookmark.name;
                  text = json.bookmark?.text;
              }

              loading = false;
          } catch (e) {
              console.error(e);
              close(false);
          }
      }
  })
</script>

<Modal title={$_('bookmark_add_management')} onclose={remove}>
  {#if (loading)}
    <LoadingSpinner></LoadingSpinner>
  {:else}
    <p class="modal-description">{$_('bookmark_cloud_add_description')}<br>
      <a href="https://docs.tokimeki.blue/privacy" target="_blank" rel="noopener">{$_('privacy_policy')}</a></p>

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
      <button class="button button--sm button--border button--danger" onclick={remove}>{$_('cancel')}</button>
    </div>

    <CloudBookmarkMenu {id} {_agent} {close}></CloudBookmarkMenu>
  {/if}
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