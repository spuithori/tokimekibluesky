<script lang="ts">
    import {workerTimer} from "$lib/stores";
    import {onDestroy} from "svelte";

    let shouldCancel = true;

    function handleTimer(e) {
        if (e.data % 60 === 0) {
            if (shouldCancel) {
                let id = window.requestAnimationFrame(() => {});

                while(id--) {
                    window.cancelAnimationFrame(id);
                }

                shouldCancel = false;
            }
        }
    }

    $workerTimer.addEventListener('message', handleTimer);

    onDestroy(() => {
        $workerTimer.removeEventListener('message', handleTimer);
    });
</script>