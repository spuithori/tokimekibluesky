<script lang="ts">
    import Notification from "./Notification.svelte";
    import {agent} from '$lib/stores';

    let { column = $bindable(), index, _agent = $agent } = $props();

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
          notifications={column.data.feed}
          cursor={column.data.cursor}
          feedPool={column.data.feedPool}
          notificationGroup={column.data.notificationGroup}
          lastRefresh={column.lastRefresh}
          filter={column.filter || ['like', 'repost', 'reply', 'mention', 'quote', 'follow']}
          id={column.id}
  ></Notification>
</div>
