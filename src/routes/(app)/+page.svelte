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
	<div class="flex gap-2">
		<div class="refresh">
			<button class="btn variant-filled-primary" on:click={refresh}>更新</button>
		</div>

		<div class="logout">
			<form method="POST" action="?/logout">
				<button class="btn variant-ringed-error" type="submit" name="logout" value="true">ログアウト</button>
			</form>
		</div>

		<div class="notification-icon">
			<button class="btn-icon variant-soft-primary"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="22.206" viewBox="0 0 20 22.206">
				<path id="notifications-outline" d="M37.556,9.345v7.778h8.889V9.345a4.444,4.444,0,1,0-8.889,0Zm2.256-6.3a2.159,2.159,0,0,1-.028-.35,2.222,2.222,0,1,1,4.415.363l0-.013a6.681,6.681,0,0,1,4.467,6.293v.007h0v6.667L52,18.233v1.111H32V18.233l3.333-2.222V9.342a6.669,6.669,0,0,1,4.431-6.283l.047-.014Zm4.411,17.411a2.222,2.222,0,0,1-4.444,0h4.444Z" transform="translate(-32 -0.472)" fill="#fff"/>
			</svg>
			</button>
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
