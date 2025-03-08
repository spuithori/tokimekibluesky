<script lang="ts">
    import {agents, pauseColumn, workerTimer} from "$lib/stores";
    import {onDestroy, onMount} from "svelte";

    async function updateChatLog() {
        let promises = [];

        if ($pauseColumn) {
            return false;
        }

        try {
            $agents.forEach(_agent => {
                promises = [...promises, _agent ? _agent.getChatLogs() : Promise.reject(new Error('no agent'))];
            });

            Promise.allSettled(promises).then(results => {
                results.forEach((result, index) => {
                    if (result.status === 'fulfilled') {
                        // console.log(result.value);
                    }
                })
            })
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