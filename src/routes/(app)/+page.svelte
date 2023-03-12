<script>
	import { onMount } from "svelte";
	import Timeline from "./Timeline.svelte";
	import { agent, cursor, notificationCount } from '$lib/stores';
	import { timeline } from "$lib/stores";
	import { goto } from "$app/navigation";

	async function refresh() {
		const data = await $agent.getTimeline();
		timeline.set(data.feed);
		cursor.set(data.cursor);
		notificationCount.set(await $agent.getNotificationCount());
	}
</script>

<svelte:head>
	<title>Home - TokimekiBluesky</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head>

<section>
	<div class="refresh">
		<button class="refresh-button" on:click={refresh}>更新</button>
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
