import { UnicodeString } from '$lib/atproto-richtext';
import type { Facet } from '$lib/atproto-richtext';

export const CASHTAG_REGEX =
  /(^|\s|\()\$([A-Za-z][A-Za-z0-9]{0,4})(?=[\s.,;:!?)"'\u2019]|$)/gu;

export const JP_CASHTAG_REGEX =
  /(^|\s|\()\$[\\¥](\d{4,5})(?=[\s.,;:!?)"'\u2019]|$)/gu;

export function detectCashtagFacets(text: UnicodeString): Facet[] {
    const facets: Facet[] = [];
    let match: RegExpExecArray | null;

    const re = new RegExp(CASHTAG_REGEX.source, CASHTAG_REGEX.flags);
    while ((match = re.exec(text.utf16))) {
        const leading = match[1];
        const ticker = match[2].toUpperCase();
        const index = match.index + leading.length;

        facets.push({
            index: {
                byteStart: text.utf16IndexToUtf8Index(index),
                byteEnd: text.utf16IndexToUtf8Index(index + 1 + ticker.length),
            },
            features: [
                {
                    $type: 'app.bsky.richtext.facet#tag',
                    tag: '$' + ticker,
                },
            ],
        });
    }

    const jpRe = new RegExp(JP_CASHTAG_REGEX.source, JP_CASHTAG_REGEX.flags);
    while ((match = jpRe.exec(text.utf16))) {
        const leading = match[1];
        const code = match[2];
        const index = match.index + leading.length;

        facets.push({
            index: {
                byteStart: text.utf16IndexToUtf8Index(index),
                byteEnd: text.utf16IndexToUtf8Index(index + 2 + code.length),
            },
            features: [
                {
                    $type: 'app.bsky.richtext.facet#tag',
                    tag: '$¥' + code,
                },
            ],
        });
    }

    return facets;
}
