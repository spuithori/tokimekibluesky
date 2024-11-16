<script lang="ts">
    import Notification from "./Notification.svelte";
    import {agent} from '$lib/stores';
    import {getColumnState} from "$lib/classes/columnState.svelte";

    let { index, isJunk, _agent = $agent, unique } = $props();
    const columnState = getColumnState(isJunk);
    const column = columnState.getColumn(index);

    function handleCountUpdate(count: number) {
        column.unreadCount = count;
    }

    function handleFilterChange(filter: any) {
        column.filter = filter;
    }
</script>

<div class="timeline">
  <Notification
          isPage={false}
          {_agent}
          isOnlyShowUnread={column.settings?.onlyShowUnread}
          sound={column.settings?.playSound}
          onupdate={handleCountUpdate}
          onchange={handleFilterChange}
          bind:notifications={column.data.feed}
          bind:cursor={column.data.cursor}
          bind:feedPool={column.data.feedPool}
          bind:notificationGroup={column.data.notificationGroup}
          bind:lastRefresh={column.lastRefresh}
          filter={column.filter || ['like', 'repost', 'reply', 'mention', 'quote', 'follow']}
          id={column.id}
          {unique}
  ></Notification>
</div>