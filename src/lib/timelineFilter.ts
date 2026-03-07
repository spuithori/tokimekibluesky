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

// Lightweight moderation: replaces @atproto/api's moderatePost
// Returns an object with .ui(context) method compatible with detectHide/detectWarn
function localModeratePost(post: any, options: any) {
    const labels = post?.labels || [];
    const authorLabels = post?.author?.labels || [];
    const allLabels = [...labels, ...authorLabels];
    const userPrefs = options.prefs?.labels || {};
    const labelDefs = options.labelDefs || [];
    const muted = post?.viewer?.muted || false;

    // Collect label actions based on user preferences
    const authorDid = post?.author?.did;
    const labelActions: Array<{ label: any; action: string; target: 'content' | 'media'; labelDef: any; source: any }> = [];

    for (const label of allLabels) {
        const val = label.val;
        // Skip system labels (e.g. !no-unauthenticated) except !warn
        if (val?.startsWith('!') && val !== '!warn') continue;
        const pref = userPrefs[val];

        // Check custom labeler definitions
        const customDef = labelDefs.find((d: any) => d.identifier === val);
        const defaultSeverity = customDef?.defaultSetting || customDef?.severity;

        const action = pref || defaultSeverity || 'warn';

        // Determine target (media vs content)
        const isMediaLabel = ['porn', 'sexual', 'nudity', 'nsfw', 'graphic-media'].includes(val);
        const target = isMediaLabel ? 'media' : 'content';

        // Build source info (compatible with @atproto/api moderatePost output)
        const source = label.src === authorDid
            ? { type: 'user' }
            : { type: 'labeler', did: label.src };

        labelActions.push({ label, action, target, labelDef: customDef || null, source });
    }

    return {
        muted,
        ui(context: string) {
            let filter = false;
            let blur = false;
            let inform = false;
            const blurs: any[] = [];
            const informs: any[] = [];

            // Muted posts are filtered in list context
            if (muted && context === 'contentList') {
                filter = true;
            }

            for (const { label, action, target, labelDef, source } of labelActions) {
                const wrapped = { label, labelDef, source };
                if (action === 'hide') {
                    if (context === 'contentList') {
                        filter = true;
                    } else {
                        blur = true;
                        blurs.push(wrapped);
                    }
                } else if (action === 'warn') {
                    if (context === 'contentMedia' && target === 'media') {
                        blur = true;
                        blurs.push(wrapped);
                    } else if (context !== 'contentMedia' && target === 'content') {
                        blur = true;
                        blurs.push(wrapped);
                    }
                } else if (action === 'inform') {
                    inform = true;
                    informs.push(wrapped);
                }
            }

            return { filter, blur, inform, blurs, informs };
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

    const options = {
        userDid: did,
        prefs: {
            adultContentEnabled: true,
            mutedWords: [],
            hiddenPosts: [],
            labelers: labelerSettings,
            labels: labels,
        },
        labelDefs: labelDefs,
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
        // Nothing.
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
