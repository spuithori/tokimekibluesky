<script lang="ts">
  import {agents, pauseColumn, workerTimer} from "$lib/stores";
  import {getAccountIdByDid} from "$lib/util";
  import {onDestroy} from "svelte";
  import {getColumnState} from "$lib/classes/columnState.svelte";
  import {getSeenEpoch} from "$lib/components/notification/notificationLedger";
  import type {Column} from "$lib/types/column";

  const columnState = getColumnState();

  function collectNotificationColumns(): Map<string, Column[]> {
      const columnsByTarget = new Map<string, Column[]>();

      const register = (column: Column | undefined) => {
          if (column?.algorithm?.type !== 'notification') {
              return;
          }
          const key = `${column.did}\n${column.settings?.notificationPriority === true}`;
          const list = columnsByTarget.get(key);
          if (list) {
              list.push(column);
          } else {
              columnsByTarget.set(key, [column]);
          }
      };

      for (const column of columnState.columns) {
          register(column);
          register(column.splitColumn);
      }

      return columnsByTarget;
  }

  function updateCount() {
      if ($pauseColumn) {
          return;
      }

      for (const [target, columns] of collectNotificationColumns()) {
          const [did, priority] = target.split('\n');
          const accountId = getAccountIdByDid($agents, did);
          const _agent = accountId !== undefined ? $agents.get(accountId) : undefined;
          if (!_agent) {
              continue;
          }

          const epochAtRequest = getSeenEpoch(did);
          _agent.getNotificationCount(priority === 'true')
              .then((count: number) => {
                  if (getSeenEpoch(did) !== epochAtRequest) {
                      return;
                  }
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
