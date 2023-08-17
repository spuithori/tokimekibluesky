<script lang="ts">
	import { columns, isAfterReload, settings } from '$lib/stores';
	import Decks from "./Decks.svelte";
	import Single from "./Single.svelte";
	import type { Snapshot } from './$types';

	let scrolls;

	export const snapshot: Snapshot = {
		capture: () => scrolls = $settings.design.layout === 'decks' ? $columns.map(column => column.scrollElement.scrollTop) : undefined,
		restore: (value) => {
			if(!$isAfterReload && value) {
				scrolls = value;

				scrolls.forEach((scroll, index) => {
					$columns[index].scrollElement.scrollTop = scroll;
				})
			}

			isAfterReload.set(false);
		}
	};

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
