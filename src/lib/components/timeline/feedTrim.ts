type FeedItem = {
    memoryCursor?: string;
};

export type FeedTrimPlan = {
    spliceStart: number;
    cursor: string;
};

const DEFAULT_BORDER_INDEX = 39;
const MEDIA_BORDER_INDEX = 119;

export function trimFeedAtBorder(feed: FeedItem[], style?: string): FeedTrimPlan | null {
    const borderIndex = style === 'media' ? MEDIA_BORDER_INDEX : DEFAULT_BORDER_INDEX;

    if (!Array.isArray(feed) || feed.length <= borderIndex + 1) {
        return null;
    }

    const borderItem = feed[borderIndex];
    if (!borderItem?.memoryCursor) {
        return null;
    }

    const lastCursorIndex = feed.findLastIndex(item => item?.memoryCursor === borderItem.memoryCursor);
    if (lastCursorIndex === -1) {
        return null;
    }

    return {
        spliceStart: lastCursorIndex + 1,
        cursor: borderItem.memoryCursor,
    };
}
