<script>
    import {_} from "svelte-i18n";
    import UserItem from "../../../routes/(app)/profile/[handle]/UserItem.svelte";
    import Modal from "$lib/components/ui/Modal.svelte";
    import Infinite from "$lib/components/utils/Infinite.svelte";

    let { actor, _agent, onclose } = $props();
    let followers = $state([]);
    let cursor;

    async function handleLoadMore(loaded, complete) {
        try {
            const res = await _agent.agent.api.app.bsky.graph.getKnownFollowers({actor: actor, cursor: cursor});
            console.log(res)
            cursor = res.data.cursor;
            followers = [...followers, ...res.data.followers];

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

<Modal title={$_('social_proof_users')} size="small" {onclose}>
  <div class="likes">
    {#each followers as actor}
      {#if (!actor.viewer?.muted)}
        <UserItem user={actor}></UserItem>
      {/if}
    {/each}
  </div>

  <Infinite oninfinite={handleLoadMore}></Infinite>
</Modal>
