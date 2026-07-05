<script lang="ts">
    import RiceBar from './RiceBar.svelte';

    interface Props {
        position: 'top' | 'bottom';
    }

    let { position }: Props = $props();
</script>

<RiceBar {position}></RiceBar>
