<script lang="ts">
	import { settings } from '$lib/stores';
	import type { Snapshot } from './$types';
	import { m } from "$lib/paraglide/messages.js";

	let scrolls;

	export const snapshot: Snapshot = {
		capture: () => scrolls = $settings.design.layout !== 'decks' ? document.querySelector(':root').scrollTop : undefined,
		restore: (value) => {
			if(value) {
				scrolls = value;

				if ($settings.design.layout !== 'decks') {
					document.querySelector(':root').scrollTop = scrolls;
				}
			}
		}
	};
</script>

<svelte:head>
	<title>{m.page_title_home()} - TOKIMEKI</title>
	<meta name="description" content="Timeline" />
</svelte:head>
