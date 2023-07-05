<script lang="ts">
    import { onDestroy } from 'svelte';
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();

    export let delay = 60000;

    const interval = setInterval(() => {
        dispatch('timer');
    }, delay);

    onDestroy(() => {
        clearInterval(interval);
    });
</script>
