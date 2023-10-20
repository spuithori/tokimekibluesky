import {moderatePost, ModerationOpts} from '@atproto/api'
import {isMatch, parse, parseISO, set} from "date-fns";
import isWithinInterval from "date-fns/isWithinInterval";

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

export function contentLabelling(post, did, settings) {
    let labels = settings.moderation?.contentLabels || {
        gore: 'warn',
        hate: 'warn',
        impersonation: 'warn',
        nsfw: 'warn',
        nudity: 'warn',
        spam: 'warn',
        suggestive: 'warn',
    };
    labels['!warn'] = 'warn';
    labels.spoiler = 'warn';

    const options: ModerationOpts = {
        userDid: did,
        labels: labels,
        adultContentEnabled: true,
        labelers: [],
    }

    return moderatePost(post, options);
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

export function keywordFilter(keywords, text, indexedAt) {
    let isHide = false;

    if (!Array.isArray(keywords)) {
        return false;
    }

    keywords.forEach((keyword: formattedKeyword) => {
        const timeIsValid = isMatch(keyword.period.start, 'HH:mm') && isMatch(keyword.period.end, 'HH:mm');

        if (!timeIsValid || keyword.word.length === 0) {
            return false;
        }

        if (keyword.enabled === false) {
            return false;
        }

        const start = keyword.period.start;
        const end = keyword.period.end;

        const postDate = set(parseISO(indexedAt), {
            year: new Date().getFullYear(),
            month: new Date().getMonth(),
            date: new Date().getDate(),
        })

        const isIntervalWithin = start < end
            ? isWithinInterval(postDate, {
                start: parse(start, 'HH:mm', new Date),
                end: parse(end + ':59', 'HH:mm:ss', new Date),
            })
            : isWithinInterval(postDate, {
                start: parse('00:00', 'HH:mm', new Date),
                end: parse(end + ':59', 'HH:mm:ss', new Date),
            }) ||
            isWithinInterval(postDate, {
                start: parse(start, 'HH:mm', new Date),
                end: parse('23:59:59', 'HH:mm:ss', new Date),
            });

        const isInclude = keyword.ignoreCaseSensitive
            ? keyword.word.some(w => text.toLowerCase().includes(w.toLowerCase()))
            : keyword.word.some(w => text.includes(w));

        if (isIntervalWithin && isInclude) {
            isHide = true;
        }
    });

    return isHide;
}