<script lang="ts">
    import { riceState } from '$lib/rice/riceState.svelte';
    import Footer from './Footer.svelte';
    import RiceFooter from '$lib/components/rice/RiceFooter.svelte';
</script>

{#if riceState.footer}
    <RiceFooter></RiceFooter>
{:else}
    <Footer></Footer>
{/if}
