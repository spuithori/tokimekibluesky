import {keywordMuteState} from "$lib/classes/keywordMuteState.svelte";

function isValidTimeFormat(time: string): boolean {
    if (typeof time !== 'string') return false;
    const match = time.match(/^(\d{2}):(\d{2})$/);
    if (!match) return false;
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

function getMinutesFromDate(date: Date): number {
    return date.getHours() * 60 + date.getMinutes();
}

function isTimeWithinRange(minutes: number, startMinutes: number, endMinutes: number): boolean {
    if (startMinutes <= endMinutes) {
        return minutes >= startMinutes && minutes <= endMinutes;
    } else {
        return minutes >= startMinutes || minutes <= endMinutes;
    }
}

export interface keyword {
    enabled?: boolean,
    word: string | string[],
    period: {
        start: string,
        end: string
    },
    ignoreCaseSensitive?: boolean,
    regExp?: boolean,
}

export interface formattedKeyword extends keyword {
    word: string[],
}

export const defaultKeyword: keyword = {
    enabled: true,
    word: '',
    period: {
        start: '00:00',
        end: '23:59',
    },
    ignoreCaseSensitive: false,
    regExp: false,
}

interface ModerationBehavior {
    profileList?: 'blur' | 'alert' | 'inform';
    profileView?: 'blur' | 'alert' | 'inform';
    avatar?: 'blur' | 'alert';
    banner?: 'blur';
    displayName?: 'blur';
    contentList?: 'blur' | 'alert' | 'inform';
    contentView?: 'blur' | 'alert' | 'inform';
    contentMedia?: 'blur';
}

interface InterpretedLabelValueDefinition {
    identifier: string;
    configurable: boolean;
    defaultSetting: 'ignore' | 'warn' | 'hide';
    flags: string[];
    severity: string;
    blurs: string;
    behaviors: {
        account?: ModerationBehavior;
        profile?: ModerationBehavior;
        content?: ModerationBehavior;
    };
    locales: any[];
    definedBy?: string;
    adultOnly?: boolean;
}

type LabelPreference = 'ignore' | 'warn' | 'hide';

interface ModerationCause {
    type: 'label' | 'muted';
    source?: { type: 'user' } | { type: 'labeler'; did: string };
    label?: any;
    labelDef?: InterpretedLabelValueDefinition;
    target?: 'content' | 'account';
    setting?: LabelPreference;
    behavior?: ModerationBehavior;
    noOverride?: boolean;
    priority: number;
}

const CUSTOM_LABEL_VALUE_RE = /^[a-z-]+$/;
const NOOP_BEHAVIOR: ModerationBehavior = {};

const MUTE_BEHAVIOR: ModerationBehavior = {
    profileList: 'inform',
    profileView: 'alert',
    contentList: 'blur',
    contentView: 'inform',
};

const LABELS: Record<string, InterpretedLabelValueDefinition> = {
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
    porn: {
        identifier: 'porn',
        configurable: true,
        defaultSetting: 'hide',
        flags: ['adult'],
        severity: 'none',
        blurs: 'media',
        behaviors: {
            account: { avatar: 'blur', banner: 'blur' },
            profile: { avatar: 'blur', banner: 'blur' },
            content: { contentMedia: 'blur' },
        },
        locales: [],
    },
    sexual: {
        identifier: 'sexual',
        configurable: true,
        defaultSetting: 'warn',
        flags: ['adult'],
        severity: 'none',
        blurs: 'media',
        behaviors: {
            account: { avatar: 'blur', banner: 'blur' },
            profile: { avatar: 'blur', banner: 'blur' },
            content: { contentMedia: 'blur' },
        },
        locales: [],
    },
    nudity: {
        identifier: 'nudity',
        configurable: true,
        defaultSetting: 'ignore',
        flags: [],
        severity: 'none',
        blurs: 'media',
        behaviors: {
            account: { avatar: 'blur', banner: 'blur' },
            profile: { avatar: 'blur', banner: 'blur' },
            content: { contentMedia: 'blur' },
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
            account: { avatar: 'blur', banner: 'blur' },
            profile: { avatar: 'blur', banner: 'blur' },
            content: { contentMedia: 'blur' },
        },
        locales: [],
    },
    gore: {
        identifier: 'gore',
        configurable: true,
        defaultSetting: 'warn',
        flags: ['adult'],
        severity: 'none',
        blurs: 'media',
        behaviors: {
            account: { avatar: 'blur', banner: 'blur' },
            profile: { avatar: 'blur', banner: 'blur' },
            content: { contentMedia: 'blur' },
        },
        locales: [],
    },
};

function interpretLabelValueDefinition(
    def: any,
    definedBy: string | undefined,
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
        defaultSetting = def.defaultSetting;
    }

    const flags: string[] = ['no-self'];
    if (def.adultOnly) {
        flags.push('adult');
    }

    return {
        ...def,
        definedBy,
        configurable: true,
        defaultSetting,
        flags,
        behaviors,
    };
}

function measureBehaviorSeverity(beh: ModerationBehavior | undefined): number {
    if (!beh) return 2;
    if (beh.profileView === 'blur' || beh.contentView === 'blur') return 0;
    if (beh.contentList === 'blur' || beh.contentMedia === 'blur') return 1;
    return 2;
}

function localModeratePost(post: any, options: any) {
    const allLabels = [...(post?.labels || []), ...(post?.author?.labels || [])];
    const authorDid = post?.author?.did;
    const isMe = authorDid === options.userDid;
    const muted = post?.viewer?.muted || false;

    const causes: ModerationCause[] = [];

    if (muted) {
        causes.push({ type: 'muted', source: { type: 'user' }, priority: 6 });
    }

    for (const label of allLabels) {
        const labelDef: InterpretedLabelValueDefinition | undefined =
            CUSTOM_LABEL_VALUE_RE.test(label.val)
                ? (options.labelDefs?.[label.src]?.find((d: any) => d.identifier === label.val)
                    || LABELS[label.val])
                : LABELS[label.val];

        if (!labelDef) continue;

        const isSelf = label.src === authorDid;
        const labeler = isSelf
            ? undefined
            : options.prefs.labelers.find((s: any) => s.did === label.src);

        if (!isSelf && !labeler) continue;
        if (isSelf && labelDef.flags.includes('no-self')) continue;

        let labelPref: LabelPreference = labelDef.defaultSetting || 'ignore';
        if (!labelDef.configurable) {
            labelPref = labelDef.defaultSetting || 'hide';
        } else if (labelDef.flags.includes('adult') && !options.prefs.adultContentEnabled) {
            labelPref = 'hide';
        } else if (labeler?.labels[labelDef.identifier]) {
            labelPref = labeler.labels[labelDef.identifier];
        } else if (options.prefs.labels[labelDef.identifier]) {
            labelPref = options.prefs.labels[labelDef.identifier];
        }

        if (labelPref === 'ignore') continue;

        if (labelDef.flags.includes('unauthed') && !!options.userDid) continue;

        const target: 'content' | 'account' = 'content';

        const behavior = labelDef.behaviors[target] || NOOP_BEHAVIOR;
        const severity = measureBehaviorSeverity(behavior);

        let priority: number;
        if (
            labelDef.flags.includes('no-override') ||
            (labelDef.flags.includes('adult') && !options.prefs.adultContentEnabled)
        ) {
            priority = 1;
        } else if (labelPref === 'hide') {
            priority = 2;
        } else if (severity === 0) {
            priority = 5;
        } else if (severity === 1) {
            priority = 7;
        } else {
            priority = 8;
        }

        let noOverride = false;
        if (labelDef.flags.includes('no-override')) {
            noOverride = true;
        } else if (labelDef.flags.includes('adult') && !options.prefs.adultContentEnabled) {
            noOverride = true;
        }

        causes.push({
            type: 'label',
            source: isSelf || !labeler
                ? { type: 'user' }
                : { type: 'labeler', did: labeler.did },
            label,
            labelDef,
            target,
            setting: labelPref,
            behavior,
            noOverride,
            priority,
        });
    }

    return {
        muted,
        ui(context: string) {
            const filters: ModerationCause[] = [];
            const blurs: ModerationCause[] = [];
            const alerts: ModerationCause[] = [];
            const informs: ModerationCause[] = [];
            let noOverride = false;

            for (const cause of causes) {
                if (cause.type === 'muted') {
                    if (!isMe) {
                        if (context === 'profileList' || context === 'contentList') {
                            filters.push(cause);
                        }
                        const muteAction = (MUTE_BEHAVIOR as any)[context];
                        if (muteAction === 'blur') {
                            blurs.push(cause);
                        } else if (muteAction === 'alert') {
                            alerts.push(cause);
                        } else if (muteAction === 'inform') {
                            informs.push(cause);
                        }
                    }
                } else if (cause.type === 'label') {
                    if (
                        context === 'contentList' &&
                        (cause.target === 'account' || cause.target === 'content') &&
                        cause.setting === 'hide' &&
                        !isMe
                    ) {
                        filters.push(cause);
                    }

                    const action = cause.behavior ? (cause.behavior as any)[context] : undefined;
                    if (action === 'blur') {
                        blurs.push(cause);
                        if (cause.noOverride && !isMe) {
                            noOverride = true;
                        }
                    } else if (action === 'alert') {
                        alerts.push(cause);
                    } else if (action === 'inform') {
                        informs.push(cause);
                    }
                }
            }

            filters.sort((a, b) => a.priority - b.priority);
            blurs.sort((a, b) => a.priority - b.priority);

            return {
                noOverride,
                filter: filters.length > 0,
                blur: blurs.length > 0,
                alert: alerts.length > 0,
                inform: informs.length > 0,
                filters,
                blurs,
                alerts,
                informs,
            };
        }
    };
}

export function contentLabelling(post: any, did: string, settings: any, labelDefs: any, labelerSettings: any = []) {
    let labels = settings.moderation?.contentLabels || {
        porn: 'warn',
        sexual: 'warn',
        nudity: 'warn',
        'graphic-media': 'warn',
    };
    labels['!warn'] = 'warn';
    labels.spoiler = 'warn';

    const labelDefMap: Record<string, InterpretedLabelValueDefinition[]> = {};
    if (Array.isArray(labelDefs)) {
        for (const def of labelDefs) {
            const defDid = def.definedBy;
            if (!defDid) continue;
            if (!labelDefMap[defDid]) labelDefMap[defDid] = [];
            labelDefMap[defDid].push(
                def.behaviors
                    ? def
                    : interpretLabelValueDefinition(def, defDid)
            );
        }
    }

    const options = {
        userDid: did,
        prefs: {
            adultContentEnabled: settings.moderation?.adultContentEnabled ?? true,
            mutedWords: [],
            hiddenPosts: [],
            labelers: labelerSettings,
            labels: labels,
        },
        labelDefs: labelDefMap,
    }

    return localModeratePost(post, options);
}

export function keywordStringToArray(word: any) {
    if (typeof word !== 'string') {
        return word;
    }

    const words = word
        .split(',')
        .map(w => w.trim())
        .filter(Boolean);
    return words;
}

export function keywordFilter(keywords: any, text: any, indexedAt: any) {
    if (!Array.isArray(keywords)) {
        return false;
    }

    for (const keyword of keywords as formattedKeyword[]) {
        const timeIsValid = isValidTimeFormat(keyword.period.start)
                         && isValidTimeFormat(keyword.period.end);

        if (!timeIsValid || keyword.word.length === 0) {
            continue;
        }

        if (keyword.enabled === false) {
            continue;
        }

        const postMinutes = getMinutesFromDate(new Date(indexedAt));
        const startMinutes = timeToMinutes(keyword.period.start);
        const endMinutes = timeToMinutes(keyword.period.end);

        const isIntervalWithin = isTimeWithinRange(postMinutes, startMinutes, endMinutes);

        const isInclude = keyword.ignoreCaseSensitive
            ? keyword.word.some(w => text.toLowerCase().includes(w.toLowerCase()))
            : keyword.word.some(w => text.includes(w));

        if (isIntervalWithin && isInclude) {
            return true;
        }
    }

    return false;
}

export function detectHide(moderateData: any, contentContext: 'contentView' | 'contentList', current: any, post: any) {
    if (keywordFilter(keywordMuteState.formattedKeywords, post.record.text, post.indexedAt)) {
        return true;
    }

    if (!moderateData) {
        return current;
    }

    try {
        if (moderateData.ui(contentContext).filter) {
            return true;
        }
    } catch (e) {
    }

    return current;
}

export function detectWarn(moderateData: any, contentContext: 'contentView' | 'contentList') {
    if (!moderateData) {
        return null;
    }

    let blurs: 'content' | 'media' | undefined = undefined;
    let warnLabels: any[] = [];
    let warnBehavior: 'cover' | 'inform' = 'cover';

    try {
        const contentUi = moderateData.ui(contentContext);
        const mediaUi = moderateData.ui('contentMedia');

        if (contentUi.inform) {
            warnLabels = contentUi.informs;
            warnBehavior = 'inform';

            if (!moderateData.muted && warnLabels.length) {
                blurs = 'content';
            }
        }

        if (contentUi.blur) {
            warnLabels = [...contentUi.blurs, ...mediaUi.blurs];
            warnBehavior = 'cover';
            blurs = 'content';
        }

        if (mediaUi.blur) {
            warnLabels = mediaUi.blurs;
            warnBehavior = 'cover';
            blurs = 'media';
        }

        if (blurs) {
            return {
                for: blurs,
                labels: warnLabels,
                behavior: warnBehavior,
            };
        }
    } catch (e) {
        return null;
    }

    return null;
}
