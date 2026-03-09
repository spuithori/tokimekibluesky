import {
	AppBskyEmbedRecord,
	AppBskyEmbedRecordWithMedia,
	AppBskyFeedPost,
} from '$lib/atproto-guards';
import type { Label, ModerationOpts } from './types';
import { ModerationDecision } from './decision';

export function moderatePost(post: any, opts: ModerationOpts): ModerationDecision {
	return ModerationDecision.merge(
		decideSubject(post, opts),
		decideEmbed(post.embed, opts)?.downgrade(),
		decideAccount(post.author, opts),
		decideProfile(post.author, opts),
	);
}

function decideSubject(subject: any, opts: ModerationOpts): ModerationDecision {
	const acc = new ModerationDecision();

	acc.setDid(subject.author?.did || '');
	acc.setIsMe(subject.author?.did === opts.userDid);

	if (subject.labels?.length) {
		for (const label of subject.labels) {
			acc.addLabel('content', label, opts);
		}
	}

	acc.addHidden(checkHiddenPost(subject, opts.prefs.hiddenPosts));

	if (!acc.isMe && opts.prefs.mutedWords?.length) {
		acc.addMutedWord(checkMuteWords(subject, opts.prefs.mutedWords));
	}

	return acc;
}

function decideEmbed(
	embed: any | undefined,
	opts: ModerationOpts,
): ModerationDecision | undefined {
	if (!embed) return undefined;

	if (
		(AppBskyEmbedRecord.isView(embed) ||
			AppBskyEmbedRecordWithMedia.isView(embed)) &&
		AppBskyEmbedRecord.isViewRecord(getEmbedRecord(embed))
	) {
		return decideQuotedPost(getEmbedRecord(embed), opts);
	}

	if (
		(AppBskyEmbedRecord.isView(embed) ||
			AppBskyEmbedRecordWithMedia.isView(embed)) &&
		AppBskyEmbedRecord.isViewBlocked(getEmbedRecord(embed))
	) {
		return decideBlockedQuotedPost(getEmbedRecord(embed), opts);
	}

	return undefined;
}

function getEmbedRecord(embed: any): any {
	if (AppBskyEmbedRecordWithMedia.isView(embed)) {
		return embed.record?.record;
	}
	return embed.record;
}

function decideQuotedPost(
	subject: any,
	opts: ModerationOpts,
): ModerationDecision {
	const acc = new ModerationDecision();
	acc.setDid(subject.author?.did || '');
	acc.setIsMe(subject.author?.did === opts.userDid);
	if (subject.labels?.length) {
		for (const label of subject.labels) {
			acc.addLabel('content', label, opts);
		}
	}
	return ModerationDecision.merge(
		acc,
		decideAccount(subject.author, opts),
		decideProfile(subject.author, opts),
	);
}

function decideBlockedQuotedPost(
	subject: any,
	opts: ModerationOpts,
): ModerationDecision {
	const acc = new ModerationDecision();
	acc.setDid(subject.author?.did || '');
	acc.setIsMe(subject.author?.did === opts.userDid);
	if (subject.author?.viewer?.muted) {
		if (subject.author.viewer.mutedByList) {
			acc.addMutedByList(subject.author.viewer.mutedByList);
		} else {
			acc.addMuted(subject.author.viewer.muted);
		}
	}
	if (subject.author?.viewer?.blocking) {
		if (subject.author.viewer.blockingByList) {
			acc.addBlockingByList(subject.author.viewer.blockingByList);
		} else {
			acc.addBlocking(subject.author.viewer.blocking);
		}
	}
	acc.addBlockedBy(subject.author?.viewer?.blockedBy);
	return acc;
}

function decideAccount(author: any, opts: ModerationOpts): ModerationDecision {
	const acc = new ModerationDecision();
	if (!author) return acc;

	acc.setDid(author.did);
	acc.setIsMe(author.did === opts.userDid);

	if (author.viewer?.muted) {
		if (author.viewer.mutedByList) {
			acc.addMutedByList(author.viewer.mutedByList);
		} else {
			acc.addMuted(author.viewer.muted);
		}
	}
	if (author.viewer?.blocking) {
		if (author.viewer.blockingByList) {
			acc.addBlockingByList(author.viewer.blockingByList);
		} else {
			acc.addBlocking(author.viewer.blocking);
		}
	}
	acc.addBlockedBy(author.viewer?.blockedBy);

	for (const label of filterAccountLabels(author.labels)) {
		acc.addLabel('account', label, opts);
	}

	return acc;
}

function decideProfile(author: any, opts: ModerationOpts): ModerationDecision {
	const acc = new ModerationDecision();
	if (!author) return acc;

	acc.setDid(author.did);
	acc.setIsMe(author.did === opts.userDid);

	for (const label of filterProfileLabels(author.labels)) {
		acc.addLabel('profile', label, opts);
	}

	return acc;
}

function filterAccountLabels(labels?: Label[]): Label[] {
	if (!labels) return [];
	return labels.filter(
		(label) =>
			!label.uri.endsWith('/app.bsky.actor.profile/self') ||
			label.val === '!no-unauthenticated',
	);
}

function filterProfileLabels(labels?: Label[]): Label[] {
	if (!labels) return [];
	return labels.filter((label) =>
		label.uri.endsWith('/app.bsky.actor.profile/self'),
	);
}

function checkHiddenPost(
	subject: any,
	hiddenPosts: string[] | undefined,
): boolean {
	if (!hiddenPosts?.length) return false;
	if (hiddenPosts.includes(subject.uri)) return true;

	if (subject.embed) {
		if (
			AppBskyEmbedRecord.isView(subject.embed) &&
			AppBskyEmbedRecord.isViewRecord(subject.embed.record) &&
			hiddenPosts.includes(subject.embed.record.uri)
		) {
			return true;
		}
		if (
			AppBskyEmbedRecordWithMedia.isView(subject.embed) &&
			AppBskyEmbedRecord.isViewRecord(subject.embed.record?.record) &&
			hiddenPosts.includes(subject.embed.record.record.uri)
		) {
			return true;
		}
	}
	return false;
}

function checkMuteWords(subject: any, mutedWords: any[]): boolean {
	if (!mutedWords?.length) return false;

	if (AppBskyFeedPost.isRecord(subject.record)) {
		const post = subject.record;
		if (post.text && hasMutedWordInText(mutedWords, post.text, post.facets, post.tags, post.langs, subject.author)) {
			return true;
		}
	}

	return false;
}

function hasMutedWordInText(
	mutedWords: any[],
	text: string,
	_facets?: any[],
	_outlineTags?: string[],
	_languages?: string[],
	_actor?: any,
): boolean {
	if (!text) return false;
	const postText = text.toLowerCase();

	for (const muteWord of mutedWords) {
		const mutedValue = (muteWord.value || '').toLowerCase();
		if (!mutedValue) continue;

		if (muteWord.expiresAt && muteWord.expiresAt < new Date().toISOString()) continue;

		if (
			muteWord.actorTarget === 'exclude-following' &&
			_actor?.viewer?.following
		) continue;

		if (!muteWord.targets?.includes('content') && !muteWord.targets?.includes('tag')) continue;

		if (postText.includes(mutedValue)) {
			return true;
		}
	}

	return false;
}
