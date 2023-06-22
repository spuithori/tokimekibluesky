<script lang="ts">
	import { columns, settings } from '$lib/stores';
	import Decks from "./Decks.svelte";
	import Single from "./Single.svelte";

	$: {
		if ($settings?.general.disableAlgorithm === 'true') {
			$columns = [{
				algorithm: {
					type: 'default',
					name: 'HOME'
				},
				style: 'default'
			}];
		}
	}
</script>

<svelte:head>
	<title>Home - TOKIMEKI Bluesky</title>
	<meta name="description" content="Timeline" />
</svelte:head>

<section>
	{#if $settings.design.layout !== 'decks'}
		<Single></Single>
	{:else}
		<Decks></Decks>
	{/if}
</section>

<style lang="postcss">

</style>
