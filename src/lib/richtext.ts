import { RichText } from '$lib/atproto-richtext';

export function getTextArray(record) {
    let array = [];
    const rt: RichText = new RichText({
        text: record.text,
        facets: record.facets,
    });
    for (const segment of rt.segments()) {
        array.push(segment);
    }

    return array;
}

export function isUriLocal(uri: string) {
    try {
        return new URL(uri).hostname === 'bsky.app' || new URL(uri).hostname === 'staging.bsky.app';
    } catch (e) {
        console.log(e);
        return false;
    }
}