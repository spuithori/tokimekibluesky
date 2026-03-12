export const CUSTOM_LABEL_VALUE_RE = /^[a-z-]+$/;

export interface ModerationBehavior {
	profileList?: 'blur' | 'alert' | 'inform';
	profileView?: 'blur' | 'alert' | 'inform';
	avatar?: 'blur' | 'alert';
	banner?: 'blur';
	displayName?: 'blur';
	contentList?: 'blur' | 'alert' | 'inform';
	contentView?: 'blur' | 'alert' | 'inform';
	contentMedia?: 'blur';
}

export const BLOCK_BEHAVIOR: ModerationBehavior = {
	profileList: 'blur',
	profileView: 'alert',
	avatar: 'blur',
	banner: 'blur',
	contentList: 'blur',
	contentView: 'blur',
};

export const MUTE_BEHAVIOR: ModerationBehavior = {
	profileList: 'inform',
	profileView: 'alert',
	contentList: 'blur',
	contentView: 'inform',
};

export const MUTEWORD_BEHAVIOR: ModerationBehavior = {
	contentList: 'blur',
	contentView: 'blur',
};

export const HIDE_BEHAVIOR: ModerationBehavior = {
	contentList: 'blur',
	contentView: 'blur',
};

export const NOOP_BEHAVIOR: ModerationBehavior = {};

export type LabelPreference = 'ignore' | 'warn' | 'hide';
export type LabelTarget = 'account' | 'profile' | 'content';
export type LabelValueDefinitionFlag = 'no-override' | 'adult' | 'unauthed' | 'no-self';

export interface Label {
	src: string;
	uri: string;
	cid?: string;
	val: string;
	neg?: boolean;
	cts: string;
	exp?: string;
}

export interface InterpretedLabelValueDefinition {
	identifier: string;
	configurable: boolean;
	defaultSetting: LabelPreference;
	flags: LabelValueDefinitionFlag[];
	severity: 'inform' | 'alert' | 'none';
	blurs: 'content' | 'media' | 'none';
	behaviors: {
		account?: ModerationBehavior;
		profile?: ModerationBehavior;
		content?: ModerationBehavior;
	};
	locales: LabelValueDefinitionLocale[];
	definedBy?: string;
	adultOnly?: boolean;
}

export interface LabelValueDefinitionLocale {
	lang: string;
	name: string;
	description: string;
}

export interface LabelValueDefinition {
	identifier: string;
	severity: string;
	blurs: string;
	defaultSetting?: string;
	adultOnly?: boolean;
	locales: LabelValueDefinitionLocale[];
}

export type ModerationCauseSource =
	| { type: 'user' }
	| { type: 'list'; list?: any }
	| { type: 'labeler'; did: string };

export type ModerationCauseType = 'blocking' | 'blocked-by' | 'block-other' | 'muted' | 'mute-word' | 'hidden' | 'label';

export interface ModerationCause {
	type: ModerationCauseType;
	source: ModerationCauseSource;
	priority: number;
	downgraded?: boolean;
	label?: Label;
	labelDef?: InterpretedLabelValueDefinition;
	target?: LabelTarget;
	setting?: LabelPreference;
	behavior?: ModerationBehavior;
	noOverride?: boolean;
}

export interface ModerationOpts {
	userDid: string | undefined;
	prefs: ModerationPrefs;
	labelDefs?: Record<string, InterpretedLabelValueDefinition[]>;
}

export interface ModerationPrefs {
	adultContentEnabled: boolean;
	labels: Record<string, LabelPreference>;
	labelers: LabelerSettings[];
	mutedWords: MutedWord[];
	hiddenPosts: string[];
}

export interface LabelerSettings {
	did: string;
	labels: Record<string, LabelPreference>;
}

export interface MutedWord {
	value: string;
	targets: string[];
	expiresAt?: string;
	actorTarget?: 'all' | 'exclude-following';
}
