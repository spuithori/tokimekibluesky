import {moderatePost, ModerationOpts} from '@atproto/api'
import {isMatch, parse, parseISO, set} from "date-fns";
import isWithinInterval from "date-fns/isWithinInterval";

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

export function keywordFilter(keywords, text, indexedAt) {
    let isHide = false;

    if (!Array.isArray(keywords)) {
        return false;
    }

    keywords.forEach(keyword => {
        const timeIsValid = isMatch(keyword.period.start, 'HH:mm') && isMatch(keyword.period.end, 'HH:mm');
        if (!timeIsValid || keyword.word === '') {
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

        if (isIntervalWithin && text.includes(keyword.word)) {
            isHide = true;
        }
    });

    return isHide;
}