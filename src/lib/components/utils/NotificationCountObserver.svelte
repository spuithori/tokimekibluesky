<script lang="ts">
  import {agents, pauseColumn, workerTimer} from "$lib/stores";
  import {getAccountIdByDid} from "$lib/util";
  import {onDestroy} from "svelte";
  import {getColumnState} from "$lib/classes/columnState.svelte";
  import type {Column} from "$lib/types/column";

  const columnState = getColumnState();

  function collectNotificationColumns(): Map<string, Column[]> {
      const columnsByDid = new Map<string, Column[]>();

      const register = (column: Column | undefined) => {
          if (column?.algorithm?.type !== 'notification') {
              return;
          }
          const list = columnsByDid.get(column.did);
          if (list) {
              list.push(column);
          } else {
              columnsByDid.set(column.did, [column]);
          }
      };

      for (const column of columnState.columns) {
          register(column);
          register(column.splitColumn);
      }

      return columnsByDid;
  }

  function updateCount() {
      if ($pauseColumn) {
          return;
      }

      for (const [did, columns] of collectNotificationColumns()) {
          const accountId = getAccountIdByDid($agents, did);
          const _agent = accountId !== undefined ? $agents.get(accountId) : undefined;
          if (!_agent) {
              continue;
          }

          _agent.getNotificationCount()
              .then((count: number) => {
                  for (const column of columns) {
                      column.unreadCount = count;
                  }
              })
              .catch((e: unknown) => {
                  console.error(e);
              });
      }
  }
  updateCount();

  function handleTimer(e: MessageEvent) {
      if (e.data % 30 === 0) {
          updateCount();
      }
  }

  $workerTimer.addEventListener('message', handleTimer);

  onDestroy(() => {
      $workerTimer.removeEventListener('message', handleTimer);
  })
</script>
