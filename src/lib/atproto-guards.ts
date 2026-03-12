// Local type guard functions that replace @atproto/api imports.
// All checks are simple $type string comparisons - no @atproto/api dependency needed.

function is$typed(v: any, id: string, hash: string): boolean {
	const t = v?.$type;
	return t === `${id}#${hash}` || t === id;
}

export const AppBskyEmbedImages = {
	isView: (v: any): boolean => is$typed(v, 'app.bsky.embed.images', 'view'),
	isMain: (v: any): boolean => is$typed(v, 'app.bsky.embed.images', 'main')
};

export const AppBskyEmbedExternal = {
	isView: (v: any): boolean => is$typed(v, 'app.bsky.embed.external', 'view'),
	isMain: (v: any): boolean => is$typed(v, 'app.bsky.embed.external', 'main')
};

export const AppBskyEmbedRecord = {
	isView: (v: any): boolean => is$typed(v, 'app.bsky.embed.record', 'view'),
	isViewRecord: (v: any): boolean => is$typed(v, 'app.bsky.embed.record', 'viewRecord'),
	isViewNotFound: (v: any): boolean => is$typed(v, 'app.bsky.embed.record', 'viewNotFound'),
	isViewBlocked: (v: any): boolean => is$typed(v, 'app.bsky.embed.record', 'viewBlocked'),
	isViewDetached: (v: any): boolean => is$typed(v, 'app.bsky.embed.record', 'viewDetached')
};

export const AppBskyEmbedRecordWithMedia = {
	isView: (v: any): boolean => is$typed(v, 'app.bsky.embed.recordWithMedia', 'view'),
	isMain: (v: any): boolean => is$typed(v, 'app.bsky.embed.recordWithMedia', 'main')
};

export const AppBskyEmbedVideo = {
	isView: (v: any): boolean => is$typed(v, 'app.bsky.embed.video', 'view')
};

export interface AppBskyVideoDefsJobStatus {
	jobId: string;
	did: string;
	state: string;
	progress?: number;
	blob?: any;
	error?: string;
	message?: string;
}

export const AppBskyFeedDefs = {
	isReasonRepost: (v: any): boolean => is$typed(v, 'app.bsky.feed.defs', 'reasonRepost'),
	isReasonPin: (v: any): boolean => is$typed(v, 'app.bsky.feed.defs', 'reasonPin'),
	isNotFoundPost: (v: any): boolean => is$typed(v, 'app.bsky.feed.defs', 'notFoundPost'),
	isBlockedPost: (v: any): boolean => is$typed(v, 'app.bsky.feed.defs', 'blockedPost'),
	isBlockedAuthor: (v: any): boolean => is$typed(v, 'app.bsky.feed.defs', 'blockedAuthor'),
	isGeneratorView: (v: any): boolean => is$typed(v, 'app.bsky.feed.defs', 'generatorView')
};

export const AppBskyFeedPost = {
	isRecord: (v: any): boolean => is$typed(v, 'app.bsky.feed.post', 'main')
};

export const AppBskyRichtextFacet = {
	isMention: (v: any): boolean => is$typed(v, 'app.bsky.richtext.facet', 'mention'),
	isTag: (v: any): boolean => is$typed(v, 'app.bsky.richtext.facet', 'tag')
};

export const AppBskyGraphDefs = {
	isListView: (v: any): boolean => is$typed(v, 'app.bsky.graph.defs', 'listView'),
	isStarterPackViewBasic: (v: any): boolean =>
		is$typed(v, 'app.bsky.graph.defs', 'starterPackViewBasic')
};

// Aliases for direct imports used in some files
export const isReasonRepost = AppBskyFeedDefs.isReasonRepost;
export const isReasonPin = AppBskyFeedDefs.isReasonPin;

// ToolsOzoneReportDefs constants
export const ToolsOzoneReportDefs = {
	REASONAPPEAL: 'tools.ozone.report.defs#reasonAppeal',
	REASONOTHER: 'tools.ozone.report.defs#reasonOther',
	REASONVIOLENCEANIMAL: 'tools.ozone.report.defs#reasonViolenceAnimal',
	REASONVIOLENCETHREATS: 'tools.ozone.report.defs#reasonViolenceThreats',
	REASONVIOLENCEGRAPHICCONTENT: 'tools.ozone.report.defs#reasonViolenceGraphicContent',
	REASONVIOLENCEGLORIFICATION: 'tools.ozone.report.defs#reasonViolenceGlorification',
	REASONVIOLENCEEXTREMISTCONTENT: 'tools.ozone.report.defs#reasonViolenceExtremistContent',
	REASONVIOLENCETRAFFICKING: 'tools.ozone.report.defs#reasonViolenceTrafficking',
	REASONVIOLENCEOTHER: 'tools.ozone.report.defs#reasonViolenceOther',
	REASONSEXUALABUSECONTENT: 'tools.ozone.report.defs#reasonSexualAbuseContent',
	REASONSEXUALNCII: 'tools.ozone.report.defs#reasonSexualNCII',
	REASONSEXUALDEEPFAKE: 'tools.ozone.report.defs#reasonSexualDeepfake',
	REASONSEXUALANIMAL: 'tools.ozone.report.defs#reasonSexualAnimal',
	REASONSEXUALUNLABELED: 'tools.ozone.report.defs#reasonSexualUnlabeled',
	REASONSEXUALOTHER: 'tools.ozone.report.defs#reasonSexualOther',
	REASONCHILDSAFETYCSAM: 'tools.ozone.report.defs#reasonChildSafetyCSAM',
	REASONCHILDSAFETYGROOM: 'tools.ozone.report.defs#reasonChildSafetyGroom',
	REASONCHILDSAFETYPRIVACY: 'tools.ozone.report.defs#reasonChildSafetyPrivacy',
	REASONCHILDSAFETYHARASSMENT: 'tools.ozone.report.defs#reasonChildSafetyHarassment',
	REASONCHILDSAFETYOTHER: 'tools.ozone.report.defs#reasonChildSafetyOther',
	REASONHARASSMENTTROLL: 'tools.ozone.report.defs#reasonHarassmentTroll',
	REASONHARASSMENTTARGETED: 'tools.ozone.report.defs#reasonHarassmentTargeted',
	REASONHARASSMENTHATESPEECH: 'tools.ozone.report.defs#reasonHarassmentHateSpeech',
	REASONHARASSMENTDOXXING: 'tools.ozone.report.defs#reasonHarassmentDoxxing',
	REASONHARASSMENTOTHER: 'tools.ozone.report.defs#reasonHarassmentOther',
	REASONMISLEADINGBOT: 'tools.ozone.report.defs#reasonMisleadingBot',
	REASONMISLEADINGIMPERSONATION: 'tools.ozone.report.defs#reasonMisleadingImpersonation',
	REASONMISLEADINGSPAM: 'tools.ozone.report.defs#reasonMisleadingSpam',
	REASONMISLEADINGSCAM: 'tools.ozone.report.defs#reasonMisleadingScam',
	REASONMISLEADINGELECTIONS: 'tools.ozone.report.defs#reasonMisleadingElections',
	REASONMISLEADINGOTHER: 'tools.ozone.report.defs#reasonMisleadingOther',
	REASONRULESITESECURITY: 'tools.ozone.report.defs#reasonRuleSiteSecurity',
	REASONRULEPROHIBITEDSALES: 'tools.ozone.report.defs#reasonRuleProhibitedSales',
	REASONRULEBANEVASION: 'tools.ozone.report.defs#reasonRuleBanEvasion',
	REASONRULEOTHER: 'tools.ozone.report.defs#reasonRuleOther',
	REASONSELFHARMCONTENT: 'tools.ozone.report.defs#reasonSelfHarmContent',
	REASONSELFHARMED: 'tools.ozone.report.defs#reasonSelfHarmED',
	REASONSELFHARMSTUNTS: 'tools.ozone.report.defs#reasonSelfHarmStunts',
	REASONSELFHARMSUBSTANCES: 'tools.ozone.report.defs#reasonSelfHarmSubstances',
	REASONSELFHARMOTHER: 'tools.ozone.report.defs#reasonSelfHarmOther'
} as const;
