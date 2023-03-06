<script>
	import { onMount } from "svelte";
	import {format, subMinutes, subDays, parseISO} from 'date-fns'
	import { page } from '$app/stores';
	import { Agent } from "$lib/agent";
	import Cookies from 'js-cookie';
	import Timeline from "./Timeline.svelte";
	import { agent } from '$lib/stores';
	import { timeline } from "$lib/stores";

	let publishContent = '';
	let isTextareaEnabled = false;

	const publishKeypress = e => {
		if (e.charCode === 13) publish();
	};
	let publish = function () {};

	async function refresh() {
		timeline.set(await $agent.getTimeline());
	}

	onMount(async () => {
		publish = async function () {
			isTextareaEnabled = true;

			await $agent.agent.api.app.bsky.feed.post.create(
					{ did: $agent.did() },
					{ text: publishContent, createdAt: new Date().toISOString() }
			);

			isTextareaEnabled = false;
			publishContent = '';
			timeline.set(await $agent.getTimeline(agent));
		}
	})
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

		<div class="logout">
			<form method="POST" action="?/logout">
				<button class="button button--border button--white" type="submit" name="logout" value="true">ログアウト</button>
			</form>
		</div>
	</div>

	<Timeline></Timeline>

	<section class="publish-group">
		<div class="publish-form">
			<textarea type="text" class="publish-form__input" disabled={isTextareaEnabled} bind:value={publishContent} on:keypress={publishKeypress} placeholder="PRESS ENTER..."></textarea>
		</div>
	</section>
</section>

<style>

	.copyright {
		margin-top: 40px;
	}

	.publish-group {
		position: fixed;
		left: 0;
		bottom: 0;
		right: 0;
		background-color: #fff;
		border-top: 1px solid gray;
		padding: 20px;
	}

	.logout {
		margin-left: auto;
	}

	@media (max-width: 767px) {
		.stats-grid {
			grid-template-columns: repeat(1, 1fr);
			grid-auto-rows: 150px;
			gap: 20px;
		}

		.second-title {
			font-size: 20px;
		}

		.stats-number {
			font-size: 40px;
		}
	}
</style>
