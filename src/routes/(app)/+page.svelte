<script>
	import { onMount } from "svelte";
	import Timeline from "./Timeline.svelte";
	import { agent, cursor, notificationCount } from '$lib/stores';
	import { timeline } from "$lib/stores";
	import { goto } from "$app/navigation";
	import Publish from "./Publish.svelte";

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
	<div class="buttons-group">
		<div class="refresh">
			<button class="button" on:click={refresh}>更新</button>
		</div>
	</div>

	<Timeline></Timeline>

	<Publish></Publish>
</section>

<style>
	.logout {
		margin-left: auto;
	}
</style>
