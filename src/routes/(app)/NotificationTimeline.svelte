<script lang="ts">
    import Notification from "./Notification.svelte";
    import {agent} from '$lib/stores';
    import {getColumnState} from "$lib/classes/columnState.svelte";

    let { index, isJunk, _agent = $agent } = $props();
    const columnState = getColumnState(isJunk);
    const column = columnState.getColumn(index);

    function handleCountUpdate(event) {
        column.unreadCount = event.detail.count;
    }

    function handleFilterChange(event) {
        column.filter = event.detail.filter;
    }
</script>

<div class="timeline">
  <Notification
          isPage={false}
          {_agent}
          isOnlyShowUnread={column.settings?.onlyShowUnread}
          sound={column.settings?.playSound}
          on:update={handleCountUpdate}
          on:change={handleFilterChange}
          bind:notifications={column.data.feed}
          bind:cursor={column.data.cursor}
          bind:feedPool={column.data.feedPool}
          bind:notificationGroup={column.data.notificationGroup}
          bind:lastRefresh={column.lastRefresh}
          filter={column.filter || ['like', 'repost', 'reply', 'mention', 'quote', 'follow']}
          id={column.id}
  ></Notification>
</div>