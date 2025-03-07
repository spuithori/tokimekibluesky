<script>
    import {_} from "svelte-i18n";
    import { agent } from "$lib/stores";
    import UserItem from "../../../routes/(app)/profile/[handle]/UserItem.svelte";
    import Modal from "$lib/components/ui/Modal.svelte";
    import Infinite from "$lib/components/utils/Infinite.svelte";

    let { uri, _agent = $agent, onclose } = $props();
    let reposts = $state([]);
    let cursor;

    async function handleLoadMore(loaded, complete) {
        try {
            const res = await _agent.agent.api.app.bsky.feed.getRepostedBy({uri: uri, cursor: cursor});
            cursor = res.data.cursor;
            reposts = [...reposts, ...res.data.repostedBy];

            if (cursor) {
                loaded();
            } else {
                complete();
            }
        } catch (e) {
            console.error(e);
            complete();
        }
    }
</script>

<Modal title={$_('reposted_users')} size="small" {onclose}>
    <div class="likes">
        {#each reposts as repost }
            {#if (!repost.viewer?.muted)}
                <UserItem user={repost}></UserItem>
            {/if}
        {/each}
    </div>

    <Infinite oninfinite={handleLoadMore}></Infinite>
</Modal>
