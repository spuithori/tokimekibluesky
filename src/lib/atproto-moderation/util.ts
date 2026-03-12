import type {
	InterpretedLabelValueDefinition,
	LabelPreference,
	LabelValueDefinition,
	LabelValueDefinitionFlag,
	ModerationBehavior,
} from './types';

export function interpretLabelValueDefinition(
	def: LabelValueDefinition,
	definedBy?: string,
): InterpretedLabelValueDefinition {
	const behaviors: {
		account: ModerationBehavior;
		profile: ModerationBehavior;
		content: ModerationBehavior;
	} = {
		account: {},
		profile: {},
		content: {},
	};

	const alertOrInform: 'alert' | 'inform' | undefined =
		def.severity === 'alert'
			? 'alert'
			: def.severity === 'inform'
				? 'inform'
				: undefined;

	if (def.blurs === 'content') {
		behaviors.account.profileList = alertOrInform;
		behaviors.account.profileView = alertOrInform;
		behaviors.account.contentList = 'blur';
		behaviors.account.contentView = def.adultOnly ? 'blur' : alertOrInform;
		behaviors.profile.profileList = alertOrInform;
		behaviors.profile.profileView = alertOrInform;
		behaviors.content.contentList = 'blur';
		behaviors.content.contentView = def.adultOnly ? 'blur' : alertOrInform;
	} else if (def.blurs === 'media') {
		behaviors.account.profileList = alertOrInform;
		behaviors.account.profileView = alertOrInform;
		behaviors.account.avatar = 'blur';
		behaviors.account.banner = 'blur';
		behaviors.profile.profileList = alertOrInform;
		behaviors.profile.profileView = alertOrInform;
		behaviors.profile.avatar = 'blur';
		behaviors.profile.banner = 'blur';
		behaviors.content.contentMedia = 'blur';
	} else if (def.blurs === 'none') {
		behaviors.account.profileList = alertOrInform;
		behaviors.account.profileView = alertOrInform;
		behaviors.account.contentList = alertOrInform;
		behaviors.account.contentView = alertOrInform;
		behaviors.profile.profileList = alertOrInform;
		behaviors.profile.profileView = alertOrInform;
		behaviors.content.contentList = alertOrInform;
		behaviors.content.contentView = alertOrInform;
	}

	let defaultSetting: LabelPreference = 'warn';
	if (def.defaultSetting === 'hide' || def.defaultSetting === 'ignore') {
		defaultSetting = def.defaultSetting as LabelPreference;
	}

	const flags: LabelValueDefinitionFlag[] = ['no-self'];
	if (def.adultOnly) {
		flags.push('adult');
	}

	return {
		identifier: def.identifier,
		severity: (def.severity as 'inform' | 'alert' | 'none') || 'none',
		blurs: (def.blurs as 'content' | 'media' | 'none') || 'none',
		adultOnly: def.adultOnly || false,
		locales: def.locales || [],
		definedBy,
		configurable: true,
		defaultSetting,
		flags,
		behaviors,
	};
}

export function interpretLabelValueDefinitions(
	labeler: { did: string; policies?: { labelValueDefinitions?: LabelValueDefinition[] } },
): InterpretedLabelValueDefinition[] {
	if (!labeler.policies?.labelValueDefinitions) {
		return [];
	}

	return labeler.policies.labelValueDefinitions.map((def) =>
		interpretLabelValueDefinition(def, labeler.did),
	);
}
