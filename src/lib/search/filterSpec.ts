export const ARRAY_FILTER_KEYS = [
    'authors', 'mentions', 'hashtags', 'domains', 'urls', 'embeddedAtUris', 'languages',
    'excludeAuthors', 'excludeMentions', 'excludeHashtags', 'excludeDomains', 'excludeUrls',
    'excludeEmbeddedAtUris', 'excludeLanguages',
] as const;

export const BOOL_FILTER_KEYS = ['hasMedia', 'hasVideo', 'excludeReplies', 'repliesOnly', 'following', 'allTime'] as const;

export const STRING_FILTER_KEYS = ['since', 'until', 'replyParentUri', 'threadRootUri', 'queryLanguage'] as const;

type ArrayFilterKey = typeof ARRAY_FILTER_KEYS[number];
type BoolFilterKey = typeof BOOL_FILTER_KEYS[number];
type StringFilterKey = typeof STRING_FILTER_KEYS[number];

export type searchFilters =
    & { [K in ArrayFilterKey]?: string[] }
    & { [K in BoolFilterKey]?: boolean }
    & { [K in StringFilterKey]?: string };
