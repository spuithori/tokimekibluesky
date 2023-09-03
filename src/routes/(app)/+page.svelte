<script lang="ts">
	import {columns, isAfterReload, settings, sideState} from '$lib/stores';
	import type { Snapshot } from './$types';
	import {_} from 'svelte-i18n';
	import {onMount} from "svelte";

	let scrolls;

	export const snapshot: Snapshot = {
		capture: () => scrolls = $settings.design.layout === 'decks' ? $columns.map(column => column.scrollElement?.scrollTop) : document.querySelector(':root').scrollTop,
		restore: (value) => {
			if(!$isAfterReload && value) {
				scrolls = value;

				if ($settings.design.layout === 'decks') {
					scrolls.forEach((scroll, index) => {
						$columns[index].scrollElement.scrollTop = scroll;
					})
				} else {
					document.querySelector(':root').scrollTop = scrolls;
				}
			}

			isAfterReload.set(false);
		}
	};

	onMount(() => {
		// $sideState = 'publish';
	})
</script>

<svelte:head>
	<title>{$_('page_title_home')} - TOKIMEKI</title>
	<meta name="description" content="Timeline" />
</svelte:head>

