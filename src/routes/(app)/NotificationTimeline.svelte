<script lang="ts">
    import Notification from "./Notification.svelte";
    import {agent, columns} from '$lib/stores';

    export let column;
    export let index;
    export let _agent = $agent;

    function handleCountUpdate(event) {
        $columns[index].unreadCount = event.detail.count;
    }

    function handleFilterChange(event) {
        $columns[index].filter = event.detail.filter;
    }
</script>

<div class="timeline">
  <Notification
          isPage={true}
          {_agent}
          on:update={handleCountUpdate}
          on:change={handleFilterChange}
          bind:notifications={column.data.feed}
          bind:cursor={column.data.cursor}
          bind:feedPool={column.data.feedPool}
          bind:notificationGroup={column.data.notificationGroup}
          filter={column.filter || ['like', 'repost', 'reply', 'mention', 'quote', 'follow']}
  ></Notification>
</div>
