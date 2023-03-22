<script>
	import { _ } from 'svelte-i18n';
	import Timeline from "./Timeline.svelte";
	import { agent, cursor, notificationCount } from '$lib/stores';
	import { timeline } from "$lib/stores";
	import SearchForm from "./SearchForm.svelte";

	async function refresh() {
		const data = await $agent.getTimeline();
		timeline.set(data.feed);
		cursor.set(data.cursor);
		notificationCount.set(await $agent.getNotificationCount());
	}
</script>

<svelte:head>
	<title>Home - TOKIMEKI Bluesky</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head>

<section>
	<SearchForm></SearchForm>

	<div class="refresh">
		<button class="refresh-button" on:click={refresh}>{$_('refresh')}</button>
	</div>

	<Timeline></Timeline>
</section>

<style lang="postcss">
	.refresh {
		margin-bottom: 50px;

		@media (max-width: 767px) {
			margin-bottom: 30px;
		}
	}

	.refresh-button {
		background-color: var(--bg-color-1);
		color: var(--text-color-primary-colored);
		display: flex;
		align-items: center;
		justify-content: center;
		border: 3px solid var(--text-color-primary-colored);
		font-weight: 600;
		letter-spacing: .05em;
		font-size: 18px;
		border-radius: 6px;
		width: 100%;
		height: 50px;
	}
</style>
