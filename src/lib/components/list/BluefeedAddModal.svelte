<script lang="ts">
    import {agent} from '$lib/stores';
    import {onMount} from "svelte";
    import { toast } from "svelte-sonner";
    import { m } from "$lib/paraglide/messages.js";
    import BluefeedAddItem from "$lib/components/list/BluefeedAddItem.svelte";
    import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
    import Modal from "$lib/components/ui/Modal.svelte";

    let { _agent = $agent, post, onclose } = $props();

    let feeds = $state([]);
    let isDisabled = false;
    let ready = $state(false);

    onMount(async () => {
        isDisabled = true;

        try {
            const res = await fetch('https://www.bluefeed.app/api/2/listFeeds', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    token: _agent.agent.session?.accessJwt,
                }),
            });

            if (res.status !== 200) {
                throw new Error('Error');
            }

            feeds = await res.json();
        } catch (e) {
            console.error(e);
            toast.error('Error');

            feeds = [];
        }

        ready = true;
        isDisabled = false;
    })
</script>

<Modal title="{m.add_bluefeed()}" size="small" {onclose}>
  <p class="modal-description">{_agent.handle()}{m.add_bluefeed_description_suffix()}</p>

  <div class="list-add-list">
    {#if ready}
      {#each feeds as feed (feed)}
        <BluefeedAddItem {feed} {_agent} uri={post.uri}></BluefeedAddItem>
      {:else}
        {m.bluefeed_feeds_not_found()}
        <a href="https://www.bluefeed.app/" target="_blank" rel="noopener">Bluefeed</a>から新しいフィードを作成できます。
      {/each}
    {:else}
      <div class="thread-loading">
        <LoadingSpinner></LoadingSpinner>
      </div>
    {/if}
  </div>
</Modal>

<style lang="postcss">
    .list-add-list {
        margin-bottom: 16px;
    }
</style>
