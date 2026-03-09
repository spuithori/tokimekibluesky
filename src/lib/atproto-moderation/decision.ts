import { LABELS } from './labels';
import type {
	Label,
	LabelPreference,
	LabelTarget,
	ModerationBehavior,
	ModerationCause,
	ModerationOpts,
} from './types';
import {
	BLOCK_BEHAVIOR,
	CUSTOM_LABEL_VALUE_RE,
	HIDE_BEHAVIOR,
	MUTE_BEHAVIOR,
	MUTEWORD_BEHAVIOR,
	NOOP_BEHAVIOR,
} from './types';
import { ModerationUI } from './ui';

enum ModerationBehaviorSeverity {
	High,
	Medium,
	Low,
}

export class ModerationDecision {
	did: string = '';
	isMe: boolean = false;
	causes: ModerationCause[] = [];

	static merge(
		...decisions: (ModerationDecision | undefined)[]
	): ModerationDecision {
		const decisionsFiltered = decisions.filter((v): v is ModerationDecision => v != null);
		const decision = new ModerationDecision();
		if (decisionsFiltered[0]) {
			decision.did = decisionsFiltered[0].did;
			decision.isMe = decisionsFiltered[0].isMe;
		}
		decision.causes = decisionsFiltered.flatMap((d) => d.causes);
		return decision;
	}

	downgrade(): this {
		for (const cause of this.causes) {
			cause.downgraded = true;
		}
		return this;
	}

	get blocked(): boolean {
		return !!this.blockCause;
	}

	get muted(): boolean {
		return !!this.muteCause;
	}

	get blockCause(): ModerationCause | undefined {
		return this.causes.find(
			(cause) =>
				cause.type === 'blocking' ||
				cause.type === 'blocked-by' ||
				cause.type === 'block-other',
		);
	}

	get muteCause(): ModerationCause | undefined {
		return this.causes.find((cause) => cause.type === 'muted');
	}

	get labelCauses(): ModerationCause[] {
		return this.causes.filter((cause) => cause.type === 'label');
	}

	ui(context: keyof ModerationBehavior): ModerationUI {
		const ui = new ModerationUI();
		for (const cause of this.causes) {
			if (
				cause.type === 'blocking' ||
				cause.type === 'blocked-by' ||
				cause.type === 'block-other'
			) {
				if (this.isMe) {
					continue;
				}
				if (context === 'profileList' || context === 'contentList') {
					ui.filters.push(cause);
				}
				if (!cause.downgraded) {
					const beh = BLOCK_BEHAVIOR[context];
					if (beh === 'blur') {
						ui.noOverride = true;
						ui.blurs.push(cause);
					} else if (beh === 'alert') {
						ui.alerts.push(cause);
					} else if (beh === 'inform') {
						ui.informs.push(cause);
					}
				}
			} else if (cause.type === 'muted') {
				if (this.isMe) {
					continue;
				}
				if (context === 'profileList' || context === 'contentList') {
					ui.filters.push(cause);
				}
				if (!cause.downgraded) {
					const beh = MUTE_BEHAVIOR[context];
					if (beh === 'blur') {
						ui.blurs.push(cause);
					} else if (beh === 'alert') {
						ui.alerts.push(cause);
					} else if (beh === 'inform') {
						ui.informs.push(cause);
					}
				}
			} else if (cause.type === 'mute-word') {
				if (this.isMe) {
					continue;
				}
				if (context === 'contentList') {
					ui.filters.push(cause);
				}
				if (!cause.downgraded) {
					const beh = MUTEWORD_BEHAVIOR[context];
					if (beh === 'blur') {
						ui.blurs.push(cause);
					} else if (beh === 'alert') {
						ui.alerts.push(cause);
					} else if (beh === 'inform') {
						ui.informs.push(cause);
					}
				}
			} else if (cause.type === 'hidden') {
				if (context === 'profileList' || context === 'contentList') {
					ui.filters.push(cause);
				}
				if (!cause.downgraded) {
					const beh = HIDE_BEHAVIOR[context];
					if (beh === 'blur') {
						ui.blurs.push(cause);
					} else if (beh === 'alert') {
						ui.alerts.push(cause);
					} else if (beh === 'inform') {
						ui.informs.push(cause);
					}
				}
			} else if (cause.type === 'label') {
				if (context === 'profileList' && cause.target === 'account') {
					if (cause.setting === 'hide' && !this.isMe) {
						ui.filters.push(cause);
					}
				} else if (
					context === 'contentList' &&
					(cause.target === 'account' || cause.target === 'content')
				) {
					if (cause.setting === 'hide' && !this.isMe) {
						ui.filters.push(cause);
					}
				}
				if (!cause.downgraded) {
					const beh = cause.behavior?.[context];
					if (beh === 'blur') {
						ui.blurs.push(cause);
						if (cause.noOverride && !this.isMe) {
							ui.noOverride = true;
						}
					} else if (beh === 'alert') {
						ui.alerts.push(cause);
					} else if (beh === 'inform') {
						ui.informs.push(cause);
					}
				}
			}
		}

		ui.filters.sort(sortByPriority);
		ui.blurs.sort(sortByPriority);

		return ui;
	}

	setDid(did: string): void {
		this.did = did;
	}

	setIsMe(isMe: boolean): void {
		this.isMe = isMe;
	}

	addHidden(hidden: boolean): void {
		if (hidden) {
			this.causes.push({
				type: 'hidden',
				source: { type: 'user' },
				priority: 6,
			});
		}
	}

	addMutedWord(hasMatch: boolean): void {
		if (hasMatch) {
			this.causes.push({
				type: 'mute-word',
				source: { type: 'user' },
				priority: 6,
			});
		}
	}

	addBlocking(blocking: string | boolean | undefined): void {
		if (blocking) {
			this.causes.push({
				type: 'blocking',
				source: { type: 'user' },
				priority: 3,
			});
		}
	}

	addBlockingByList(blockingByList: any | undefined): void {
		if (blockingByList) {
			this.causes.push({
				type: 'blocking',
				source: { type: 'list', list: blockingByList },
				priority: 3,
			});
		}
	}

	addBlockedBy(blockedBy: boolean | undefined): void {
		if (blockedBy) {
			this.causes.push({
				type: 'blocked-by',
				source: { type: 'user' },
				priority: 4,
			});
		}
	}

	addMuted(muted: boolean | undefined): void {
		if (muted) {
			this.causes.push({
				type: 'muted',
				source: { type: 'user' },
				priority: 6,
			});
		}
	}

	addMutedByList(mutedByList: any | undefined): void {
		if (mutedByList) {
			this.causes.push({
				type: 'muted',
				source: { type: 'list', list: mutedByList },
				priority: 6,
			});
		}
	}

	addLabel(target: LabelTarget, label: Label, opts: ModerationOpts): void {
		const labelDef = CUSTOM_LABEL_VALUE_RE.test(label.val)
			? opts.labelDefs?.[label.src]?.find(
				(def) => def.identifier === label.val,
			) || LABELS[label.val]
			: LABELS[label.val];
		if (!labelDef) {
			return;
		}

		const isSelf = label.src === this.did;
		const labeler = isSelf
			? undefined
			: opts.prefs.labelers.find((s) => s.did === label.src);

		if (!isSelf && !labeler) {
			return;
		}
		if (isSelf && labelDef.flags.includes('no-self')) {
			return;
		}

		let labelPref: LabelPreference = labelDef.defaultSetting || 'ignore';
		if (!labelDef.configurable) {
			labelPref = labelDef.defaultSetting || 'hide';
		} else if (
			labelDef.flags.includes('adult') &&
			!opts.prefs.adultContentEnabled
		) {
			labelPref = 'hide';
		} else if (labeler?.labels[labelDef.identifier]) {
			labelPref = labeler.labels[labelDef.identifier];
		} else if (opts.prefs.labels[labelDef.identifier]) {
			labelPref = opts.prefs.labels[labelDef.identifier];
		}

		if (labelPref === 'ignore') {
			return;
		}

		if (labelDef.flags.includes('unauthed') && !!opts.userDid) {
			return;
		}

		let priority: 1 | 2 | 5 | 7 | 8;
		const severity = measureModerationBehaviorSeverity(
			labelDef.behaviors[target],
		);
		if (
			labelDef.flags.includes('no-override') ||
			(labelDef.flags.includes('adult') && !opts.prefs.adultContentEnabled)
		) {
			priority = 1;
		} else if (labelPref === 'hide') {
			priority = 2;
		} else if (severity === ModerationBehaviorSeverity.High) {
			priority = 5;
		} else if (severity === ModerationBehaviorSeverity.Medium) {
			priority = 7;
		} else {
			priority = 8;
		}

		let noOverride = false;
		if (labelDef.flags.includes('no-override')) {
			noOverride = true;
		} else if (
			labelDef.flags.includes('adult') &&
			!opts.prefs.adultContentEnabled
		) {
			noOverride = true;
		}

		this.causes.push({
			type: 'label',
			source:
				isSelf || !labeler
					? { type: 'user' }
					: { type: 'labeler', did: labeler.did },
			label,
			labelDef,
			target,
			setting: labelPref,
			behavior: labelDef.behaviors[target] || NOOP_BEHAVIOR,
			noOverride,
			priority,
		});
	}
}

function measureModerationBehaviorSeverity(
	beh: ModerationBehavior | undefined,
): ModerationBehaviorSeverity {
	if (!beh) {
		return ModerationBehaviorSeverity.Low;
	}
	if (beh.profileView === 'blur' || beh.contentView === 'blur') {
		return ModerationBehaviorSeverity.High;
	}
	if (beh.contentList === 'blur' || beh.contentMedia === 'blur') {
		return ModerationBehaviorSeverity.Medium;
	}
	return ModerationBehaviorSeverity.Low;
}

function sortByPriority(a: ModerationCause, b: ModerationCause): number {
	return a.priority - b.priority;
}
