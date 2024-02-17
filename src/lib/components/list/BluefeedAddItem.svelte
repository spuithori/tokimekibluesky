<script lang="ts">
  import {_} from "svelte-i18n";
  import {agent} from "$lib/stores";
  import {createEventDispatcher} from "svelte";
  import toast from "svelte-french-toast";
  import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
  const dispatch = createEventDispatcher();

  export let feed;
  export let _agent = $agent;
  export let uri;

  let isDisabled = false;
  let status: 'default' | 'processing' | 'success' | 'duplicate' | 'error' = 'default';

  async function add() {
      isDisabled = true;
      status = 'processing';

      try {
          const res = await fetch('https://www.bluefeed.app/api/addPosts', {
              method: 'POST',
              headers: {
                  'Accept': 'application/json',
              },
              body: JSON.stringify({
                  token: _agent.agent.session?.accessJwt,
                  rkey: feed.rkey,
                  postURIs: [uri],
              }),
          });
          const json = await res.json();

          if (res.status === 200 && json.message === 'duplicate') {
              toast.error($_('bluefeed_add_duplicate'));
              status = 'duplicate';
              return false;
          }

          if (res.status === 200 && json.message === 'feedNotFound') {
              toast.error($_('bluefeed_feed_notfound'));
              throw new Error('notFound');
          }

          if (res.status === 200 && json.message === 'postsNotFound') {
              toast.error($_('bluefeed_post_notfound'));
              throw new Error('notFound');
          }

          status = 'success';
          toast.success($_('bluefeed_add_success'));
          dispatch('success');
      } catch (e) {
          console.error(e);
          status = 'error';
      }
  }
</script>

<div class="bluefeed-add-item">
  <p class="bluefeed-add-item__text">{feed.name}</p>

  <div class="bluefeed-add-item__buttons">
    <a class="bluefeed-add-item__edit" href="https://www.bluefeed.app/?k={feed.rkey}" target="_blank" rel="noopener" aria-label="Bluefeed上で編集する">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
    </a>

    <button class="button button--ss" on:click={add} disabled={isDisabled}>
      {#if status === 'default'}
        {$_('bluefeed_add')}
      {:else if status === 'duplicate'}
        {$_('bluefeed_already_add')}
      {:else if status === 'processing'}
        <LoadingSpinner size="16" padding="0" color="var(--bg-color-1)"></LoadingSpinner>
      {:else if status === 'success'}
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--bg-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
      {:else}
        {$_('bluefeed_add')}
      {/if}
    </button>
  </div>
</div>

<style lang="postcss">
  .bluefeed-add-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 0;
      gap: 8px;
      border-bottom: 1px solid var(--border-color-1);

      &:first-child {
          border-top: 1px solid var(--border-color-1);
      }

      &__text {
          font-weight: bold;
          font-size: 14px;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
      }

      &__buttons {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 8px;
      }

      &__edit {
          background-color: var(--bg-color-2);
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: grid;
          place-content: center;
          color: inherit;
      }
  }
</style>