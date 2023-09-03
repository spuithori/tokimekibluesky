<script lang="ts">
    import Notification from "./Notification.svelte";
    import {agent, columns} from '$lib/stores';

    export let column;
    export let index;
    export let _agent = $agent;

    function handleCountUpdate(event) {
        $columns[index].unreadCount = event.detail.count;
    }
</script>

<div class="timeline">
  <Notification isPage={true} {_agent} on:update={handleCountUpdate}></Notification>
</div>
