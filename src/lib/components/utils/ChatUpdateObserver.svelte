<script lang="ts">
    import {agents, pauseColumn, workerTimer} from "$lib/stores";
    import {onDestroy, onMount} from "svelte";
    import {chatRealtime} from "$lib/components/chat/chatRealtime";

    async function updateChatLog(onlyDids?: Set<string>) {
        let promises = [];

        if ($pauseColumn) {
            return false;
        }

        try {
            $agents.forEach(_agent => {
                if (!_agent) {
                    return;
                }

                if (onlyDids && !onlyDids.has(_agent.did())) {
                    return;
                }

                promises = [...promises, _agent.getChatLogs()];
            });

            Promise.allSettled(promises)
                .catch(e => {
                    console.log(e);
                })
        } catch (e) {
            //
        }
    }

    function handleTimer(e) {
        if (e.data % 30 === 0) {
            updateChatLog();
        } else if (e.data % 3 === 0 && chatRealtime.hasActive) {
            updateChatLog(chatRealtime.activeDids);
        }
    }

    $workerTimer.addEventListener('message', handleTimer);

    onDestroy(() => {
        $workerTimer.removeEventListener('message', handleTimer);
    });

    onMount(() => {
      setTimeout(updateChatLog, 1000);
    });
</script>