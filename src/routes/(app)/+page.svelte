<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Timeline from "./Timeline.svelte";
	import { agent, cursor, notificationCount } from '$lib/stores';
	import { timeline } from "$lib/stores";
	import SearchForm from "./SearchForm.svelte";
	import TimelineSettings from "./TimelineSettings.svelte";

	let isRefreshing = false;

	async function refresh() {
		isRefreshing = true;
		const data = await $agent.getTimeline();
		timeline.set(data.feed);
		cursor.set(data.cursor);
		notificationCount.set(await $agent.getNotificationCount());
		isRefreshing = false;
	}
</script>

<svelte:head>
	<title>Home - TOKIMEKI Bluesky</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head>

<section>
	<div class="home-navs">
		<SearchForm></SearchForm>
		<TimelineSettings></TimelineSettings>
	</div>

	<div class="refresh">
		<button class="refresh-button" aria-label="Refresh" class:is-refreshing={isRefreshing} on:click={refresh}>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="22.855" viewBox="0 0 16 22.855">
				<path id="refresh" d="M11,3.428V5.714a5.714,5.714,0,0,0-4.045,9.759L5.343,17.084A8,8,0,0,1,11,3.428Zm5.657,2.343A8,8,0,0,1,11,19.427V17.141a5.714,5.714,0,0,0,4.045-9.759ZM11,22.855,6.428,18.284,11,13.713ZM11,9.142V0L15.57,4.571Z" transform="translate(-2.999)" fill="var(--primary-color)"/>
			</svg>
		</button>
	</div>

	<Timeline></Timeline>
</section>

<style lang="postcss">
	.refresh {
		margin-bottom: -10px;
	}

	.refresh-button {
		background-color: var(--bg-color-2);
		color: var(--text-color-primary-colored);
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--text-color-primary-colored);
		font-weight: 600;
		letter-spacing: .05em;
		font-size: 18px;
		border-radius: 6px 6px 0 0;
		width: 100%;
		height: 55px;
		padding-bottom: 8px;

		@media (max-width: 767px) {
			background-color: var(--bg-color-1);
		}

		&.is-refreshing {
			svg {
				animation: rotation .8s linear infinite;
			}
		}
	}

	.home-navs {
		display: flex;
		gap: 20px;
		margin-bottom: 20px;
	}

	@keyframes rotation {
		0%   { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
</style>
