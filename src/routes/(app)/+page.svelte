<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Timeline from "./Timeline.svelte";
	import { agent, cursor, notificationCount } from '$lib/stores';
	import { timeline, timelineStyle, currentAlgorithm, disableAlgorithm, userLists, bookmarksStore, settings } from "$lib/stores";
	import TimelineSettings from "./TimelineSettings.svelte";
	import MediaTimeline from "./MediaTimeline.svelte";
	import ListModal from "../../lib/components/list/ListModal.svelte";
	import ListTimeline from "./ListTimeline.svelte";
	import { liveQuery } from "dexie";
	import { db } from '$lib/db'
	import BookmarkModal from "../../lib/components/bookmark/BookmarkModal.svelte";
	import BookmarkTimeline from "./BookmarkTimeline.svelte";
	import RealtimeTimeline from "./RealtimeTimeline.svelte";

	try {
		const algo = JSON.parse(localStorage.getItem('currentAlgorithm'));
		currentAlgorithm.set(algo);

		if (!algo) {
			currentAlgorithm.set({type: 'default'});
			localStorage.setItem('currentAlgorithm', JSON.stringify({type: 'default'}));
		}
	} catch (e) {
		console.log(e)
		currentAlgorithm.set({type: 'default'});
		localStorage.setItem('currentAlgorithm', JSON.stringify({type: 'default'}));
	}

	let isRefreshing = false;

	let isAlgoNavOpen = false;

	let isListModalOpen = false;
	let listModalId;

	let bookmarks = liveQuery(() => db.bookmarks.toArray());
	let isBookmarkModalOpen = false;

	let realtimeConnect;

	function handleKeydown(event: { key: string; }) {
		const activeElement = document.activeElement?.tagName;

		if (event.key === 'r' && (activeElement === 'BODY' || activeElement === 'BUTTON') && !isRefreshing) {
			refresh($timelineStyle);
		}
	}

	$: {
		if (isAlgoNavOpen) {
			document.body.classList.add('scroll-lock');
		} else {
			document.body.classList.remove('scroll-lock');
		}

		if ($disableAlgorithm === 'true') {
			currentAlgorithm.set({type: 'default'});
			localStorage.setItem('currentAlgorithm', JSON.stringify({type: 'default'}));
		}

		if ($currentAlgorithm.type === 'list' && $currentAlgorithm.list && $userLists.some(list => list.id === $currentAlgorithm.list.id)) {
			currentAlgorithm.set({type: 'list', list: $userLists.find(list => list.id === $currentAlgorithm.list.id)});
			localStorage.setItem('currentAlgorithm', JSON.stringify($currentAlgorithm));
		}

		if ($currentAlgorithm.type === 'realtime') {
			isRefreshing = true;
		}

		console.log($currentAlgorithm)
	}

	async function refresh(style: 'default' | 'media') {
		isRefreshing = true;
		if ($currentAlgorithm.type === 'default' || $currentAlgorithm.type === 'custom') {
			const res = await $agent.getTimeline({limit: 25, cursor: '', algorithm: $currentAlgorithm});

			timeline.set(res.data.feed);
			cursor.set(res.data.cursor);
			notificationCount.set(await $agent.getNotificationCount());
		} else if ($currentAlgorithm.type === 'bookmark') {
			timeline.set([]);
			cursor.set(0);
		} else if ($currentAlgorithm.type === 'realtime') {
			realtimeConnect();
			return;
		} else {
			location.reload();
		}

		isRefreshing = false;
	}

	function toggleStyle(style: 'default' | 'media') {
		timelineStyle.set(style);
		localStorage.setItem('timelineStyle', style);

		if ($currentAlgorithm.type !== 'realtime') {
			refresh($timelineStyle);
		}
	}

	function openAlgoNav(currentAlgo) {
		isAlgoNavOpen = isAlgoNavOpen !== true;
		currentAlgorithm.set(currentAlgo);
		localStorage.setItem('currentAlgorithm', JSON.stringify(currentAlgo));

		if (!isAlgoNavOpen && $currentAlgorithm.type !== 'realtime') {
			refresh($timelineStyle);
		}
	}

	function listAdd(id = undefined) {
		listModalId = id;
		isListModalOpen = true;
	}

	function bookmarkAdd(bookmark = undefined) {
		isBookmarkModalOpen = true;
		bookmarksStore.set(bookmark);
	}

	function handleBookmarkClose(event) {
		isBookmarkModalOpen = false;

		if (event.detail.clear) {
			currentAlgorithm.set({type: 'default'});
			localStorage.setItem('currentAlgorithm', JSON.stringify($currentAlgorithm));
			refresh($timelineStyle);
		}
	}

	function handleListRemove(event) {
		if ($currentAlgorithm.type === 'list' && $currentAlgorithm.list && event.detail.id === $currentAlgorithm.list.id) {
			currentAlgorithm.set({type: 'default'});
			localStorage.setItem('currentAlgorithm', JSON.stringify($currentAlgorithm));
		}

		userLists.update(lists => {
			return lists.filter(list => list.id !== event.detail.id);
		});
		localStorage.setItem('lists', JSON.stringify($userLists));

		refresh($timelineStyle);

		isListModalOpen = false;
	}

	function handleListModalClose() {
		location.reload();
	}

	function handleRealtimeDisconnect() {
		isRefreshing = false;
	}
</script>

<svelte:head>
	<title>Home - TOKIMEKI Bluesky</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head>

<svelte:window on:keydown={handleKeydown} />

<section>
	<nav class="home-navs">
		{#if (!$settings.general.disableAlgorithm)}
			<div class="timeline-algo-nav">
				<div class="algo-nav" class:algo-nav--open={isAlgoNavOpen}>
					<div class="algo-nav-bg"></div>

					<ul class="algo-nav-list">
						<li class="algo-nav-list__item">
							<button class="algo-nav-button" data-algo-genre="default" data-algo-label="home" class:algo-nav-button--current={$currentAlgorithm.type === 'default'} on:click={() => {openAlgoNav({type: 'default'})}}>HOME</button>
						</li>

						{#if ($agent.agent.service.host === 'bsky.social')}
							<li class="algo-nav-list__item">
								<button class="algo-nav-button" data-algo-genre="realtime" data-algo-label="home" class:algo-nav-button--current={$currentAlgorithm.type === 'realtime'} on:click={() => {openAlgoNav({type: 'realtime'})}}>{$_('realtime')}</button>
							</li>
						{/if}

						<li class="algo-nav-list__item">
							<button class="algo-nav-button" data-algo-genre="custom" data-algo-label="whatshot" on:click={() => {openAlgoNav({type: 'custom', algorithm: 'whatshot'})}} class:algo-nav-button--current={$currentAlgorithm.algorithm === 'whatshot'} >What's Hot<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
								<g id="グループ_89" data-name="グループ 89" transform="translate(-1059 -638)">
									<rect id="長方形_76" data-name="長方形 76" width="16" height="16" transform="translate(1059 638)" fill="var(--danger-color)"/>
									<path id="パス_23" data-name="パス 23" d="M-4.216-12.446v-.781c0-1.385-1.208-2.063-2.859-2.063a4.99,4.99,0,0,0-5.157,5.3A4.893,4.893,0,0,0-7.251-4.961c1.4,0,3.006-.589,3.006-1.975v-.751h-.074a3.975,3.975,0,0,1-2.667.973c-1.9,0-3.212-1.194-3.212-3.566A3.065,3.065,0,0,1-7.06-13.537a3.617,3.617,0,0,1,2.77,1.09Z" transform="translate(1075.028 655.929)" fill="#fff"/>
								</g>
							</svg></button>
						</li>

						{#each $userLists as list}
							{#if (list.owner === $agent.did())}
								<li class="algo-nav-list__item">
									<button class="algo-nav-button" data-algo-genre="list" data-algo-label="{list.name}" on:click={() => {openAlgoNav({type: 'list', list: list})}} class:algo-nav-button--current={$currentAlgorithm.type === 'list' && $currentAlgorithm.list.id === list.id}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
										<g id="グループ_100" data-name="グループ 100" transform="translate(-1059 -662)">
											<rect id="長方形_76" data-name="長方形 76" width="16" height="16" transform="translate(1059 662)" fill="#2a14b4"/>
											<path id="パス_26" data-name="パス 26" d="M-.075-1.395v-.7a6.107,6.107,0,0,1-2.145.375h-.525c-1.545,0-1.905-.57-1.905-2.13v-4.92c0-1.02-.435-1.5-1.275-1.5h-.84V-3.72c0,2.46,1.335,3.81,3.75,3.81h.8C-.525.09-.075-.5-.075-1.395Z" transform="translate(1070.42 675.093)" fill="#fff"/>
										</g>
									</svg>
										{list.name}</button>
									<button class="algo-nav-edit" on:click={() => {listAdd(list.id || undefined)}} aria-label="Edit list"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
										<g id="グループ_99" data-name="グループ 99" transform="translate(-210 -1863)">
											<circle id="bafkreidwy6swkoyicdm5nypbhyhk7z4o5fe7g5wiyo2255irpb3a6nwffy" cx="12" cy="12" r="12" transform="translate(210 1863)" fill="#b3b3b3"/>
											<path id="edit-pencil" d="M7.38,2.22l2.4,2.4L2.4,12H0V9.6Zm.84-.84L9.6,0,12,2.4,10.62,3.78Z" transform="translate(216 1869)" fill="#fff"/>
										</g>
									</svg></button>
								</li>
							{/if}
						{/each}

						{#if ($bookmarks)}
							{#each $bookmarks as bookmark}
								{#if (bookmark.owner === $agent.did())}
									<li class="algo-nav-list__item">
										<button class="algo-nav-button" data-algo-genre="bookmark" data-algo-label="{bookmark.name}" on:click={() => {openAlgoNav({type: 'bookmark', list: String(bookmark.id)})}} class:algo-nav-button--current={$currentAlgorithm.type === 'bookmark' && $currentAlgorithm.list === String(bookmark.id)}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
											<g id="グループ_103" data-name="グループ 103" transform="translate(-1082 -686)">
												<rect id="長方形_76" data-name="長方形 76" width="16" height="16" transform="translate(1082 686)" fill="#94c74c"/>
												<path id="パス_29" data-name="パス 29" d="M-.615-3.18A2.557,2.557,0,0,0-2.43-5.43,2.117,2.117,0,0,0-.795-7.605c0-1.68-1.4-2.715-3.36-2.715H-5.4a10.581,10.581,0,0,0-2.715.465V-2.4C-8.115-.8-7.17.045-5.25.045h1.11A3.248,3.248,0,0,0-.615-3.18ZM-2.85-7.425c0,.885-.75,1.245-1.665,1.245H-6.09V-8.505a6.435,6.435,0,0,1,.885-.1h.765C-3.675-8.61-2.85-8.325-2.85-7.425Zm.165,4.305c0,.78-.54,1.29-1.65,1.29h-.84c-.51,0-.9-.285-.9-.645V-4.59H-4.44C-3.24-4.59-2.685-4.23-2.685-3.12Z" transform="translate(1094.365 699.138)" fill="#fff"/>
											</g>
										</svg>
											{bookmark.name}</button>
										<button class="algo-nav-edit" on:click={() => {bookmarkAdd(bookmark || undefined)}} aria-label="Edit list"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
											<g id="グループ_99" data-name="グループ 99" transform="translate(-210 -1863)">
												<circle id="bafkreidwy6swkoyicdm5nypbhyhk7z4o5fe7g5wiyo2255irpb3a6nwffy" cx="12" cy="12" r="12" transform="translate(210 1863)" fill="#b3b3b3"/>
												<path id="edit-pencil" d="M7.38,2.22l2.4,2.4L2.4,12H0V9.6Zm.84-.84L9.6,0,12,2.4,10.62,3.78Z" transform="translate(216 1869)" fill="#fff"/>
											</g>
										</svg></button>
									</li>
								{/if}
							{/each}
						{/if}

						<li class="algo-nav-list__item">
							<button class="algo-nav-button algo-nav-button--add algo-nav-button--add-list" on:click={() => {listAdd(undefined)}}>{$_('create_list')}</button>
						</li>

						<li class="algo-nav-list__item">
							<button class="algo-nav-button algo-nav-button--add algo-nav-button--add-bookmark" on:click={() => {bookmarkAdd(undefined)}}>{$_('create_bookmark')}</button>
						</li>
					</ul>
				</div>
			</div>
		{/if}

		{#if (isListModalOpen)}
			<ListModal id={listModalId} on:close={handleListModalClose} on:remove={handleListRemove}></ListModal>
		{/if}

		{#if (isBookmarkModalOpen)}
			<BookmarkModal bookmark={$bookmarksStore} on:close={handleBookmarkClose}></BookmarkModal>
		{/if}
	</nav>

	<div class="home-nav">
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

		{#if ($currentAlgorithm.type !== 'bookmark')}
			<div class="refresh">
				<button class="refresh-button" aria-label="Refresh" class:is-refreshing={isRefreshing} on:click={() => {refresh($timelineStyle)}} disabled={isRefreshing}>
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="22.855" viewBox="0 0 16 22.855">
						<path id="refresh" d="M11,3.428V5.714a5.714,5.714,0,0,0-4.045,9.759L5.343,17.084A8,8,0,0,1,11,3.428Zm5.657,2.343A8,8,0,0,1,11,19.427V17.141a5.714,5.714,0,0,0,4.045-9.759ZM11,22.855,6.428,18.284,11,13.713ZM11,9.142V0L15.57,4.571Z" transform="translate(-2.999)" fill="var(--primary-color)"/>
					</svg>
				</button>
			</div>
		{/if}
	</div>

	{#if ($currentAlgorithm.type === 'list')}
		{#if ($currentAlgorithm.list.members.length)}
			<ListTimeline isRefreshing={isRefreshing}></ListTimeline>
		{/if}
	{:else if ($currentAlgorithm.type === 'bookmark')}
		{#key $currentAlgorithm}
			<BookmarkTimeline isRefreshing={isRefreshing}></BookmarkTimeline>
		{/key}
	{:else if ($currentAlgorithm.type === 'realtime')}
		<RealtimeTimeline isRefreshing={isRefreshing} on:disconnect={handleRealtimeDisconnect} bind:connect={realtimeConnect}></RealtimeTimeline>
	{:else}
		<Timeline isRefreshing={isRefreshing}></Timeline>
	{/if}
</section>

<style lang="postcss">
	.refresh {

	}

	.refresh-button {
		width: 160px;
		background-color: var(--bg-color-1);
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 20px;
		box-shadow: 0 0 10px rgba(0, 0, 0, .09);

		&.is-refreshing {
			svg {
				animation: rotation .8s linear infinite;
			}
		}
	}

	.home-navs {

	}

	@keyframes rotation {
		0%   { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.timeline-algo-nav {
		order: -1;
		width: 200px;
		margin: auto;
		height: 40px;
		position: fixed;
		z-index: 100;
		left: 0;
		right: 0;
		top: 15px;

		@media (max-width: 767px) {
			order: -1;
			width: 170px;
			margin: auto;
			height: 40px;
			position: fixed;
			left: 0;
			right: 0;
			top: 20px;
		}
	}

	.algo-nav {
		position: relative;

		&--open {
			position: fixed;
			z-index: 9998;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			overflow: auto;

			.algo-nav-list {
				position: absolute;
				left: 0;
				right: 0;
				top: 15px;
				margin: auto;
				display: flex;
				flex-direction: column;
				gap: 20px;
				align-items: center;
				justify-content: center;

				@media (max-width: 767px) {
					top: 20px;
				}
			}

			.algo-nav-bg {
				opacity: 1;
				visibility: visible;
			}

			.algo-nav-edit {
				display: block;
			}

			.algo-nav-button {
				&:not(.algo-nav-button--current) {
					display: block;
				}
			}
		}
	}

	.algo-nav-bg {
		opacity: 0;
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		top: 0;
		visibility: hidden;
		backdrop-filter: blur(5px);
		background-color: rgba(0, 8, 25, .8);
		transition: all .3s ease-in-out;
	}

	.algo-nav-list {
		list-style: none;

		&__item {
			position: relative;

			@media (max-width: 767px) {
				display: flex;
				justify-content: center;
				width: 170px;
				margin-left: auto;
				margin-right: auto;
			}

			&:has(.algo-nav-button--current) {
				order: -1;
			}
		}
	}

	.algo-nav-button {
		width: 200px;
		height: 40px;
		align-items: center;
		justify-content: center;
		text-align: center;
		border-radius: 20px;
		background-color: var(--bg-color-1);
		box-shadow: 0 2px 14px rgba(0, 0, 0, .08);
		color: var(--text-color-1);
		font-weight: 900;
		cursor: pointer;
		transition: box-shadow .2s ease-in-out;
		letter-spacing: .05em;
		position: relative;
		white-space: nowrap;
		text-overflow: ellipsis;
		overflow: hidden;
		padding: 0 35px;

		@media (max-width: 767px) {
			width: 170px;
		}

		svg {
			position: absolute;
			left: 15px;
			top: 0;
			bottom: 0;
			margin: auto;
		}

		&:hover {
			box-shadow: 0 2px 24px rgba(0, 0, 0, .16);
		}

		&:not(.algo-nav-button--current) {
			display: none;
		}

		&--current {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 6px;

			&::after {
				content: '';
				display: block;
				background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11.599' height='7.421' viewBox='0 0 11.599 7.421'%3E%3Cpath id='パス_27' data-name='パス 27' d='M4393.408,794.858l4.389,5.01,4.388-5.01' transform='translate(-4391.997 -793.447)' fill='none' stroke='%231d1d1d' stroke-linecap='round' stroke-linejoin='round' stroke-width='2'/%3E%3C/svg%3E%0A");
				width: 12px;
				height: 8px;
				background-size: contain;
				margin-top: 2px;
				flex-shrink: 0;
			}

			& + .algo-nav-edit {
				display: block;
			}
		}

		&--add {
			background-color: var(--primary-color);
			color: var(--bg-color-1);
			font-weight: 600;
		}

		&--add-list {
			background-color: var(--color-theme-4);

			@media (max-width: 767px) {
				font-size: 14px;
				padding: 0 10px;
			}
		}

		&--add-bookmark {
			background-color: var(--color-theme-8);

			@media (max-width: 767px) {
				font-size: 14px;
				padding: 0 10px;
			}
		}
	}

	.algo-nav-edit {
		position: absolute;
		right: 10px;
		top: 0;
		bottom: 0;
		margin: auto;
		display: none;
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
			width: 100%;
		}
	}

	.home-nav {
		display: flex;
		justify-content: space-between;
		margin-bottom: 20px;
	}
</style>
