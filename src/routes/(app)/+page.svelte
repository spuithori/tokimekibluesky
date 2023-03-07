<script>
	import { onMount } from "svelte";
	import Timeline from "./Timeline.svelte";
	import { agent } from '$lib/stores';
	import { timeline } from "$lib/stores";

	let publishContent = '';
	let isTextareaEnabled = false;

	const publishKeypress = e => {
		console.log(e)
		if (e.keyCode === 13 && e.altKey) publish();
	};
	let publish = function () {};

	async function refresh() {
		timeline.set(await $agent.getTimeline());
	}

	onMount(async () => {
		publish = async function () {
			isTextareaEnabled = true;

			if (!publishContent) {
				isTextareaEnabled = false;
				return false;
			}

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
			<textarea type="text" class="publish-form__input" disabled={isTextareaEnabled} bind:value={publishContent} on:keydown={publishKeypress} placeholder="Alt + Enter"></textarea>
			<button class="publish-form__submit" on:click={publish}><svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
				<title></title>
				<g id="icomoon-ignore">
				</g>
				<path fill="var(--primary-color)" d="M1009.376 5.12c-5.312-3.424-11.36-5.12-17.376-5.12-6.176 0-12.384 1.76-17.76 5.376l-960 640c-9.888 6.56-15.328 18.112-14.048 29.952 1.216 11.808 8.896 22.016 19.936 26.368l250.368 100.192 117.728 206.016c5.632 9.888 16.096 16 27.424 16.128 0.128 0 0.224 0 0.352 0 11.232 0 21.664-5.952 27.424-15.552l66.464-110.816 310.24 124.064c3.808 1.536 7.808 2.272 11.872 2.272 5.44 0 10.816-1.376 15.68-4.128 8.448-4.736 14.24-13.056 15.872-22.624l160-960c2.080-12.576-3.488-25.184-14.176-32.128zM100.352 664.864l741.6-494.432-539.2 577.184c-2.848-1.696-5.376-3.936-8.512-5.184l-193.888-77.568zM326.048 770.112c-0.064-0.128-0.16-0.192-0.224-0.32l606.176-648.8-516.768 805.184-89.184-156.064zM806.944 947.488l-273.312-109.312c-6.496-2.56-13.248-3.424-19.936-3.808l420.864-652.416-127.616 765.536z"></path>
			</svg></button>
		</div>
	</section>
</section>

<style>
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
</style>
