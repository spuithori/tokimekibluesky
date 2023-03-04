<script>
	import {AtpAgent, AtpSessionData, AtpSessionEvent} from '@atproto/api';
	import {onMount} from "svelte";
	import {format, subMinutes, subDays, parseISO} from 'date-fns'
	import { page } from '$app/stores';
	import {tr} from "date-fns/locale";

	let datum = [];
	let datas = [];
	let publishContent = '';
	let votes = {};
	const myDid = $page.data.did;

	let isTextareaEnabled = false;

	//await agent.resumeSession(JSON.parse(token))

	const publishKeypress = e => {
		if (e.charCode === 13) publish();
	};
	let publish = function () {};

	const agent = new AtpAgent({
		service: 'https://bsky.social',
	})
	agent.resumeSession($page.data)


	async function gettl() {
		const main = async () => {
			datum = await agent.api.app.bsky.feed.getTimeline({ limit: 10 });
			datas = datum.data.feed
			console.log(datum.data)
		};

		main()
				.then(() => {})
				.catch((e) => console.error(e));
	}

	async function refreshTimeline() {
		datum = await agent.api.app.bsky.feed.getTimeline({ limit: 10 });
		datas = datum.data.feed
	}

	async function setVote(cid, uri, direction) {
		const main = async () => {
			await agent.api.app.bsky.feed.setVote(
					{ direction: direction, subject: { cid: cid, uri: uri } }
			);
		};

		main()
				.then(() => {
					refreshTimeline();
				})
				.catch((e) => console.error(e));
	}

	async function setRepost(cid, uri) {
		const main = async () => {
			await agent.api.app.bsky.feed.repost.create(
					{ did: myDid },
					{ subject: { cid: cid, uri: uri } , createdAt: new Date().toISOString() },
			);
		};

		main()
				.then(() => {
					refreshTimeline();
				})
				.catch((e) => console.error(e));
	}

	async function getVotes(uri) {
		const datum = await agent.api.app.bsky.feed.getVotes({uri: uri});
		// console.log(datum.data.votes)
		return datum.data.votes;
	}

	async function myVoteCheck(uri) {
		const votes = await getVotes(uri);

		const found = votes.find(vote => vote.actor.did === myDid)
		return found;
	}

	onMount(async () => {
		gettl()

		publish = async function () {
			isTextareaEnabled = true;
			
			await agent.api.app.bsky.feed.post.create(
					{ did: myDid },
					{ text: publishContent, createdAt: new Date().toISOString() }
			);

			isTextareaEnabled = false;
			publishContent = '';
			refreshTimeline();
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
			<button class="btn variant-filled-primary" on:click={refreshTimeline}>更新</button>
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

	<ul class="timeline">
		{#each datas as data}
			<li class="timeline__item">
				{#if (data.reason)}
					<p class="timeline-repost-message">{ data.reason.by.displayName } がリポスト</p>
				{/if}

				{#if (data.reply)}
					<p class="timeline-repost-message">{ data.reply.parent.author.displayName } に返信</p>
				{/if}

				<div class="timeline__column">
					<div class="timeline__image">
						<img src="{ data.post.author.avatar }" alt="">
					</div>

					<div class="timeline__content">
						<div class="timeline__meta">
							<p class="timeline__user">{ data.post.author.displayName }</p>
							<p class="timeline__date">{format(parseISO(data.post.record.createdAt), 'yyyy.MM.dd HH:mm:ss')}</p>
						</div>

						<p>{ data.post.record.text }</p>

						<div class="timeline-reaction">
							<div class="timeline-reaction__item timeline-reaction__item--reply">
								<button class="timeline-reaction__icon"><svg xmlns="http://www.w3.org/2000/svg" width="21.292" height="25.277" viewBox="0 0 21.292 25.277">
									<path id="reply" d="M10.9,17.974V23.73L2,14.831l8.9-8.9v5.882c10.353.242,9.909-7.04,7.273-11.815C24.677,7.032,23.3,18.3,10.9,17.974Z" transform="translate(-1.293 0.34)" fill="#fff" stroke="#bbb" stroke-width="1"/>
								</svg>
								</button>

								{ data.post.replyCount }
							</div>

							<div class="timeline-reaction__item timeline-reaction__item--like">
								<button class="timeline-reaction__icon" on:click="{() => setVote(data.post.cid, data.post.uri, 'up')}">
									{#await myVoteCheck(data.post.uri)}
										<svg xmlns="http://www.w3.org/2000/svg" width="21" height="19.08" viewBox="0 0 21 19.08">
											<path id="heart" d="M10.111,3.244l-.617-.607A5.562,5.562,0,0,0,1.629,10.5l0,0,8.484,8.484L18.6,10.483a5.562,5.562,0,0,0-7.87-7.855l0,0-.617.617Z" transform="translate(0.389 -0.605)" fill="#fff" stroke="#bbb" stroke-width="1"/>
										</svg>
									{:then found}
										{#if (found)}
											<svg xmlns="http://www.w3.org/2000/svg" width="20" height="17.872" viewBox="0 0 20 17.872">
												<path id="heart" d="M10.111,3.244l-.617-.607A5.562,5.562,0,0,0,1.629,10.5l0,0,8.484,8.484L18.6,10.483a5.562,5.562,0,0,0-7.87-7.855l0,0-.617.617Z" transform="translate(-0.111 -1.105)" fill="#1172f0"/>
											</svg>
											{:else}
											<svg xmlns="http://www.w3.org/2000/svg" width="21" height="19.08" viewBox="0 0 21 19.08">
												<path id="heart" d="M10.111,3.244l-.617-.607A5.562,5.562,0,0,0,1.629,10.5l0,0,8.484,8.484L18.6,10.483a5.562,5.562,0,0,0-7.87-7.855l0,0-.617.617Z" transform="translate(0.389 -0.605)" fill="#fff" stroke="#bbb" stroke-width="1"/>
											</svg>
										{/if}
									{/await}
								</button>

								{ data.post.upvoteCount }
							</div>

							<div class="timeline-reaction__item timeline-reaction__item--repost">
								<button class="timeline-reaction__icon" on:click="{() => setRepost(data.post.cid, data.post.uri)}"><svg xmlns="http://www.w3.org/2000/svg" width="21" height="13" viewBox="0 0 21 13">
									<path id="retweet" d="M13.333,17.667A.342.342,0,0,1,13,18H3c-.385,0-.333-.406-.333-.667v-6h-2A.671.671,0,0,1,0,10.667a.638.638,0,0,1,.156-.427l3.333-4a.683.683,0,0,1,1.021,0l3.333,4A.636.636,0,0,1,8,10.667a.671.671,0,0,1-.667.667h-2v4h6a.356.356,0,0,1,.261.115l1.667,2A.42.42,0,0,1,13.333,17.667ZM20,13.333a.638.638,0,0,1-.156.427l-3.333,4a.664.664,0,0,1-1.021,0l-3.333-4A.636.636,0,0,1,12,13.333a.671.671,0,0,1,.667-.667h2v-4h-6a.332.332,0,0,1-.261-.125l-1.667-2a.357.357,0,0,1-.073-.209A.342.342,0,0,1,7,6H17c.385,0,.333.406.333.667v6h2A.671.671,0,0,1,20,13.333Z" transform="translate(0.5 -5.5)" fill="#fff" stroke="#bbb" stroke-width="1"/>
								</svg>
								</button>

								{ data.post.repostCount }
							</div>
						</div>

						{#if (typeof data.post.embed !== 'undefined' && typeof data.post.embed.images !== 'undefined')}

							<div class="timeline-image">
								{#each data.post.embed.images as image}
									<div class="timeline-image__item">
										<img src="{image.fullsize}" alt="" loading="lazy">
									</div>
								{/each}
							</div>

						{/if}
					</div>
				</div>
			</li>
		{/each}
	</ul>

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

	.publish-form {
		max-width: 64rem;
		margin: 0 auto;
	}

	.publish-form__input {
		background-color: #fafafa;
		border-radius: 5px;
		height: 80px;
		font-size: 16px;
		vertical-align: middle;
		width: 100%;
		padding: 10px 20px;
	}

	.timeline-reaction {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-top: 10px;
	}

	.timeline-reaction__item {
		display: flex;
		align-items: center;
		gap: 5px;
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
