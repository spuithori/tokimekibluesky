<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Timeline from "./Timeline.svelte";
	import { agent, cursor, notificationCount } from '$lib/stores';
	import { timeline, timelineStyle } from "$lib/stores";
	import TimelineSettings from "./TimelineSettings.svelte";
	import MediaTimeline from "./MediaTimeline.svelte";

	let isRefreshing = false;

	function handleKeydown(event: { key: string; }) {
		const activeElement = document.activeElement?.tagName;

		if (event.key === 'r' && (activeElement === 'BODY' || activeElement === 'BUTTON') && !isRefreshing) {
			refresh($timelineStyle);
		}
	}

	async function refresh(style: 'default' | 'media') {
		isRefreshing = true;
		let data;

		if (style === 'default') {
			data = await $agent.getTimeline();
		} else {
			data = await $agent.getMediaTimeline();
		}

		timeline.set(data.feed);
		cursor.set(data.cursor);
		notificationCount.set(await $agent.getNotificationCount());
		isRefreshing = false;
	}

	function toggleStyle(style: 'default' | 'media') {
		timelineStyle.set(style);
		localStorage.setItem('timelineStyle', style);
		refresh($timelineStyle);
	}
</script>

<svelte:head>
	<title>Home - TOKIMEKI Bluesky</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head>

<svelte:window on:keydown={handleKeydown} />

<section>
	<nav class="home-navs">
		<div class="timeline-style-nav">
			<div class="style-nav" data-current="{$timelineStyle}">
				<div class="style-nav__item style-nav__item--active style-nav__item--default">
					<button aria-label="Default Timeline" class="style-nav__button" on:click={() => {toggleStyle('default')}}>
						<svg xmlns="http://www.w3.org/2000/svg" width="21.387" height="18" viewBox="0 0 21.387 18">
							<path id="view-list" d="M0,3H21.387V5.571H0ZM0,8.143H21.387v2.571H0Zm0,5.143H21.387v2.571H0Zm0,5.143H21.387V21H0Z" transform="translate(0 -3)" fill="var(--text-color-3)"/>
						</svg>
					</button>
				</div>

				<div class="style-nav__item style-nav__item--media">
					<button aria-label="Media Timeline" class="style-nav__button" on:click={() => {toggleStyle('media')}}>
						<svg xmlns="http://www.w3.org/2000/svg" width="22.5" height="18" viewBox="0 0 22.5 18">
							<path id="photo" d="M0,4.25A2.257,2.257,0,0,1,2.25,2h18A2.25,2.25,0,0,1,22.5,4.25v13.5A2.25,2.25,0,0,1,20.25,20h-18A2.25,2.25,0,0,1,0,17.75ZM12.375,14.375,9,11,2.25,17.75h18l-5.625-5.625Zm4.5-4.5a2.25,2.25,0,1,0-2.25-2.25A2.25,2.25,0,0,0,16.875,9.875Z" transform="translate(0 -2)" fill="var(--text-color-3)"/>
						</svg>
					</button>
				</div>
			</div>
		</div>

		<div class="timeline-algo-nav">
			<select class="algo-nav">
				<option value="HOME">HOME</option>
			</select>
		</div>

		<TimelineSettings></TimelineSettings>
	</nav>

	<div class="refresh">
		<button class="refresh-button" aria-label="Refresh" class:is-refreshing={isRefreshing} on:click={() => {refresh($timelineStyle)}}>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="22.855" viewBox="0 0 16 22.855">
				<path id="refresh" d="M11,3.428V5.714a5.714,5.714,0,0,0-4.045,9.759L5.343,17.084A8,8,0,0,1,11,3.428Zm5.657,2.343A8,8,0,0,1,11,19.427V17.141a5.714,5.714,0,0,0,4.045-9.759ZM11,22.855,6.428,18.284,11,13.713ZM11,9.142V0L15.57,4.571Z" transform="translate(-2.999)" fill="var(--primary-color)"/>
			</svg>
		</button>
	</div>

	{#if ($timelineStyle === 'default')}
		<Timeline isRefreshing={isRefreshing}></Timeline>
	{:else}
		<MediaTimeline isRefreshing={isRefreshing}></MediaTimeline>
	{/if}
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
		justify-content: space-between;
		gap: 20px;
		margin-bottom: 20px;

		@media (max-width: 767px) {
			gap: 5px;
		}
	}

	@keyframes rotation {
		0%   { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.algo-nav {
		width: 170px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		border-radius: 20px;
		background-color: var(--bg-color-1);
		box-shadow: 0 2px 14px rgba(0, 0, 0, .08);
		color: var(--text-color-3);
		cursor: pointer;

		@media (max-width: 767px) {
			display: none;
		}
	}

	.style-nav {
		width: 155px;
		border: 1px solid var(--border-color-1);
		border-radius: 20px;
		height: 40px;
		background-color: var(--bg-color-1);
		display: flex;
		position: relative;

		&::before {
			content: '';
			display: block;
			position: absolute;
			top: 0;
			left: 0;
			bottom: 0;
			height: 40px;
			width: 84px;
			border-radius: 20px;
			background-color: var(--bg-color-1);
			border: 1px solid var(--primary-color);
			transition: all .2s ease-in-out;
		}

		&[data-current='default'] {
			&::before {
				transform: translateX(0);
			}

			.style-nav__item--default {
				width: 84px;

				path {
					fill: var(--primary-color);
				}
			}
		}

		&[data-current='media'] {
			&::before {
				transform: translateX(70px);
			}

			.style-nav__item--media {
				width: 84px;

				path {
					fill: var(--primary-color);
				}
			}
		}

		&__item {
			position: relative;
			width: 71px;
			flex-shrink: 0;
		}

		&__button {
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			border-radius: 20px;
			display: grid;
			place-content: center;
		}
	}
</style>
