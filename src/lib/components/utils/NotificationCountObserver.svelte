<script lang="ts">
  import {agents, pauseColumn, workerTimer} from "$lib/stores";
  import {getAccountIdByDid} from "$lib/util";
  import {onDestroy} from "svelte";
  import {getColumnState} from "$lib/classes/columnState.svelte";

  const columnState = getColumnState();

  function updateCount() {
      let promises = [];
      let notificationColumns = [];

      if ($pauseColumn) {
          return false;
      }

      columnState.columns.forEach((column, index) => {
          if (column.algorithm?.type !== 'notification') {
              return false;
          }

          const _agent = $agents.get(getAccountIdByDid($agents, column.did));
          notificationColumns = [...notificationColumns, index];
          promises = [...promises, _agent ? _agent.getNotificationCount() : Promise.reject(new Error('no agent'))];
      })

      Promise.allSettled(promises).then(results => {
          results.forEach((result, index) => {
              if (result.status === 'fulfilled') {
                  columnState.columns[notificationColumns[index]].unreadCount = result.value;
              }
          })
      })
      .catch(e => {
          console.log(e);
      })
  }
  updateCount();

  function handleTimer(e) {
      if (e.data % 30 === 0) {
          updateCount();
      }
  }

  $workerTimer.addEventListener('message', handleTimer);

  onDestroy(() => {
      $workerTimer.removeEventListener('message', handleTimer);
  })
</script>