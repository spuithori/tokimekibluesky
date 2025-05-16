<script lang="ts">
    import {workerTimer} from "$lib/stores";
    import {onDestroy} from "svelte";

    function handleTimer(e) {
        if (e.data % 60 === 0) {
            let id = window.requestAnimationFrame(() => {});
            while(id--) {
                window.cancelAnimationFrame(id);
            }
        }
    }

    $workerTimer.addEventListener('message', handleTimer);

    onDestroy(() => {
        $workerTimer.removeEventListener('message', handleTimer);
    });
</script>