import type { InterpretedLabelValueDefinition, LabelPreference } from './types';

export const DEFAULT_LABEL_SETTINGS: Record<string, LabelPreference> = {
	porn: 'hide',
	sexual: 'warn',
	nudity: 'ignore',
	'graphic-media': 'warn',
};

export const LABELS: Record<string, InterpretedLabelValueDefinition> = {
	'!hide': {
		identifier: '!hide',
		configurable: false,
		defaultSetting: 'hide',
		flags: ['no-override', 'no-self'],
		severity: 'alert',
		blurs: 'content',
		behaviors: {
			account: {
				profileList: 'blur',
				profileView: 'blur',
				avatar: 'blur',
				banner: 'blur',
				displayName: 'blur',
				contentList: 'blur',
				contentView: 'blur',
			},
			profile: {
				avatar: 'blur',
				banner: 'blur',
				displayName: 'blur',
			},
			content: {
				contentList: 'blur',
				contentView: 'blur',
			},
		},
		locales: [],
	},
	'!warn': {
		identifier: '!warn',
		configurable: false,
		defaultSetting: 'warn',
		flags: ['no-self'],
		severity: 'none',
		blurs: 'content',
		behaviors: {
			account: {
				profileList: 'blur',
				profileView: 'blur',
				avatar: 'blur',
				banner: 'blur',
				contentList: 'blur',
				contentView: 'blur',
			},
			profile: {
				avatar: 'blur',
				banner: 'blur',
				displayName: 'blur',
			},
			content: {
				contentList: 'blur',
				contentView: 'blur',
			},
		},
		locales: [],
	},
	'!no-unauthenticated': {
		identifier: '!no-unauthenticated',
		configurable: false,
		defaultSetting: 'hide',
		flags: ['no-override', 'unauthed'],
		severity: 'none',
		blurs: 'content',
		behaviors: {
			account: {
				profileList: 'blur',
				profileView: 'blur',
				avatar: 'blur',
				banner: 'blur',
				displayName: 'blur',
				contentList: 'blur',
				contentView: 'blur',
			},
			profile: {
				avatar: 'blur',
				banner: 'blur',
				displayName: 'blur',
			},
			content: {
				contentList: 'blur',
				contentView: 'blur',
			},
		},
		locales: [],
	},
	'porn': {
		identifier: 'porn',
		configurable: true,
		defaultSetting: 'hide',
		flags: ['adult'],
		severity: 'none',
		blurs: 'media',
		behaviors: {
			account: {
				avatar: 'blur',
				banner: 'blur',
			},
			profile: {
				avatar: 'blur',
				banner: 'blur',
			},
			content: {
				contentMedia: 'blur',
			},
		},
		locales: [],
	},
	'sexual': {
		identifier: 'sexual',
		configurable: true,
		defaultSetting: 'warn',
		flags: ['adult'],
		severity: 'none',
		blurs: 'media',
		behaviors: {
			account: {
				avatar: 'blur',
				banner: 'blur',
			},
			profile: {
				avatar: 'blur',
				banner: 'blur',
			},
			content: {
				contentMedia: 'blur',
			},
		},
		locales: [],
	},
	'nudity': {
		identifier: 'nudity',
		configurable: true,
		defaultSetting: 'ignore',
		flags: [],
		severity: 'none',
		blurs: 'media',
		behaviors: {
			account: {
				avatar: 'blur',
				banner: 'blur',
			},
			profile: {
				avatar: 'blur',
				banner: 'blur',
			},
			content: {
				contentMedia: 'blur',
			},
		},
		locales: [],
	},
	'graphic-media': {
		identifier: 'graphic-media',
		configurable: true,
		defaultSetting: 'warn',
		flags: ['adult'],
		severity: 'none',
		blurs: 'media',
		behaviors: {
			account: {
				avatar: 'blur',
				banner: 'blur',
			},
			profile: {
				avatar: 'blur',
				banner: 'blur',
			},
			content: {
				contentMedia: 'blur',
			},
		},
		locales: [],
	},
	'gore': {
		identifier: 'gore',
		configurable: true,
		defaultSetting: 'warn',
		flags: ['adult'],
		severity: 'none',
		blurs: 'media',
		behaviors: {
			account: {
				avatar: 'blur',
				banner: 'blur',
			},
			profile: {
				avatar: 'blur',
				banner: 'blur',
			},
			content: {
				contentMedia: 'blur',
			},
		},
		locales: [],
	},
	'spoiler': {
		identifier: 'spoiler',
		configurable: true,
		defaultSetting: 'warn',
		flags: [],
		severity: 'none',
		blurs: 'content',
		behaviors: {
			account: {
				profileList: 'blur',
				profileView: 'blur',
				contentList: 'blur',
				contentView: 'blur',
			},
			profile: {},
			content: {
				contentList: 'blur',
				contentView: 'blur',
			},
		},
		locales: [{ lang: 'en', name: 'Spoiler', description: 'Spoiler content' }],
	},
};
