<script lang="ts">
	import { settings } from '$lib/stores';
	import type { Snapshot } from './$types';
	import {_} from 'svelte-i18n';

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
	<title>{$_('page_title_home')} - TOKIMEKI</title>
	<meta name="description" content="Timeline" />
</svelte:head>
