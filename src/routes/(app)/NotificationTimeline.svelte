<script lang="ts">
    import Notification from "./Notification.svelte";
    import {agent, columns} from '$lib/stores';
    import {onMount} from "svelte";

    export let column;
    export let index;
    export let _agent = $agent;

    onMount(async () => {
        await _agent.agent.api.app.bsky.notification.updateSeen( {seenAt: new Date().toISOString()});
        $columns[index].unreadCount = 0;
    })
</script>

<div class="timeline">
  <Notification isPage={true} {_agent}></Notification>
</div>

<style lang="postcss">

</style>