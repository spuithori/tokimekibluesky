<script lang="ts">
	import { agent, columns, userLists, settings, preferences } from '$lib/stores';
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

		/* if ($columns[$currentTimeline].algorithm.type === 'list' && $columns[$currentTimeline].algorithm.list && $userLists.some(list => list.id === $columns[$currentTimeline].algorithm.list.id)) {
			$columns[$currentTimeline].algorithm = {type: 'list', list: $userLists.find(list => list.id === $columns[$currentTimeline].algorithm.list.id)}
		} */

		// console.log($columns[$currentTimeline].algorithm)
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
