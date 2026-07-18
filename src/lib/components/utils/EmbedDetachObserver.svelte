<script lang="ts">
    import {pulseDetach} from "$lib/stores";
    import {getColumnState} from "$lib/classes/columnState.svelte";

    const columnState = getColumnState(false);
    const junkColumnState = getColumnState(true);

    $effect(() => {
        const detach = $pulseDetach;
        if (!detach) {
            return;
        }

        columnState.applyEmbedDetach(detach.uri, detach.embed);
        junkColumnState.applyEmbedDetach(detach.uri, detach.embed);
    });
</script>
