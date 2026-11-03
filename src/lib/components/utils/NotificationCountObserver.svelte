<script lang="ts">
  import {agents, pauseColumn, workerTimer} from "$lib/stores";
  import {getAccountIdByDid} from "$lib/util";
  import {onDestroy} from "svelte";
  import {getColumnState} from "$lib/classes/columnState.svelte";
  import {getSeenEpoch, setSourceUnreadCount, type NotificationSource} from "$lib/components/notification/notificationLedger";
  import {notificationSources, syncNotificationBadges} from "$lib/components/notification/notificationPipeline";
  import {getMochottUnreadCount, mochottTypesFor} from "$lib/components/notification/mochottNotifications";

  interface CountTarget {
      priorities: Set<boolean>;
      mochottTypes: Set<string>;
  }

  const columnState = getColumnState();

  function collectTargets(): Map<string, CountTarget> {
      const targets = new Map<string, CountTarget>();

      for (const column of columnState.columns) {
          if (column?.algorithm?.type !== 'notification') {
              continue;
          }
          let target = targets.get(column.did);
          if (!target) {
              target = { priorities: new Set(), mochottTypes: new Set() };
              targets.set(column.did, target);
          }
          for (const source of notificationSources(column)) {
              if (source === 'bluesky') {
                  target.priorities.add(column.settings?.notificationPriority === true);
              } else {
                  for (const type of mochottTypesFor(Array.isArray(column.filter) ? column.filter : [])) {
                      target.mochottTypes.add(type);
                  }
              }
          }
      }

      return targets;
  }

  function track(did: string, source: NotificationSource, priority: boolean, request: Promise<number>) {
      const epochAtRequest = getSeenEpoch(did, source);
      request
          .then((count: number) => {
              if (getSeenEpoch(did, source) !== epochAtRequest) {
                  return;
              }
              setSourceUnreadCount(did, source, priority, count);
              syncNotificationBadges(columnState.columns, did);
          })
          .catch((e: unknown) => {
              console.error(e);
          });
  }

  function updateCount() {
      if ($pauseColumn) {
          return;
      }

      for (const [did, target] of collectTargets()) {
          const accountId = getAccountIdByDid($agents, did);
          const _agent = accountId !== undefined ? $agents.get(accountId) : undefined;
          if (!_agent) {
              continue;
          }

          for (const priority of target.priorities) {
              track(did, 'bluesky', priority, _agent.getNotificationCount(priority));
          }
          if (target.mochottTypes.size) {
              track(did, 'mochott', false, getMochottUnreadCount(_agent, [...target.mochottTypes]));
          }
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
