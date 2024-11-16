<script lang="ts">
    import {agent, agents, chatPulse, latestRevMap, pauseColumn, workerTimer} from "$lib/stores";
    import {onDestroy} from "svelte";
    import {getAccountIdByDid} from "$lib/util";
    import {page} from "$app/stores";
    import {getColumnState} from "$lib/classes/columnState.svelte";

    const columnState = getColumnState();

    async function updateChatLog() {
        let promises = [];
        let dids = [];
        let logs = [];

        if ($page.url.pathname.includes('/chat/')) {
            dids.push($agent.did());
        }

        if ($pauseColumn) {
            return false;
        }

        columnState.columns.forEach((column, index) => {
            if (column.algorithm?.type !== 'chat') {
                return false;
            }

            const did = column.did;

            if (!dids.includes(did)) {
                dids.push(did);
            }
        })

        if (!dids.length) {
            return false;
        }

        try {
            dids.forEach((did, index) => {
                const _agent = $agents.get(getAccountIdByDid($agents, did));
                const rev = $latestRevMap.get(did) || '';
                promises = [...promises, _agent ? _agent.getChatLogs(rev) : Promise.reject(new Error('no agent'))];
            })

            Promise.allSettled(promises).then(results => {
                results.forEach((result, index) => {
                    if (result.status === 'fulfilled') {
                        logs = [...result.value, ...logs];

                        if (result.value.length) {
                            const latestLog = result.value.slice(-1)[0];
                            $latestRevMap.set(dids[index], latestLog.rev);
                        }
                    }
                })

                chatPulse.set(logs);
            })
            .catch(e => {
                console.log(e);
            })
        } catch (e) {
            //
        }
    }

    async function updateCount() {

    }

    function handleTimer(e) {
        if (e.data % 5 === 0) {
            updateChatLog();
        }
    }

    $workerTimer.addEventListener('message', handleTimer);

    onDestroy(() => {
        $workerTimer.removeEventListener('message', handleTimer);
    })
</script>