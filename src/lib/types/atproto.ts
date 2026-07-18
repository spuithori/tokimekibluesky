export type Extensible = { [k: string]: unknown };

export type Label = {
    src: string;
    uri: string;
    val: string;
    cts?: string;
} & Extensible;

export type ViewerState = {
    muted?: boolean;
    blockedBy?: boolean;
    blocking?: string;
    following?: string;
    followedBy?: string;
} & Extensible;

export type ProfileViewBasic = {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
    viewer?: ViewerState;
    labels?: Label[];
} & Extensible;

export type ProfileView = ProfileViewBasic & {
    description?: string;
    indexedAt?: string;
};

export type ProfileViewDetailed = ProfileView & {
    banner?: string;
    followersCount?: number;
    followsCount?: number;
    postsCount?: number;
    associated?: Extensible;
    pinnedPost?: { uri: string; cid: string } & Extensible;
};

export type PostViewerState = {
    like?: string;
    repost?: string;
    bookmarked?: boolean;
    threadMuted?: boolean;
    replyDisabled?: boolean;
    pinned?: boolean;
} & Extensible;

export type PostView = {
    uri: string;
    cid: string;
    author: ProfileViewBasic;
    record: Extensible;
    embed?: Extensible;
    replyCount?: number;
    repostCount?: number;
    likeCount?: number;
    quoteCount?: number;
    bookmarkCount?: number;
    indexedAt: string;
    viewer?: PostViewerState;
    labels?: Label[];
} & Extensible;

export type FeedReason = {
    $type: string;
    by?: ProfileViewBasic;
    indexedAt?: string;
} & Extensible;

export type FeedViewPost = {
    post: PostView;
    reply?: {
        root?: Extensible;
        parent?: Extensible;
        grandparentAuthor?: ProfileViewBasic;
    } & Extensible;
    reason?: FeedReason;
} & Extensible;

export type ThreadViewPost = {
    $type?: string;
    post: PostView;
    parent?: Extensible;
    replies?: Extensible[];
} & Extensible;

export type FeedPage = {
    feed: FeedViewPost[];
    cursor?: string;
} & Extensible;

export type ListView = {
    uri: string;
    cid?: string;
    name: string;
    purpose: string;
    description?: string;
    avatar?: string;
    listItemCount?: number;
    creator?: ProfileView;
} & Extensible;

export type ListItemView = {
    uri: string;
    subject: ProfileView;
} & Extensible;

export type GeneratorView = {
    uri: string;
    cid?: string;
    did?: string;
    creator?: ProfileView;
    displayName: string;
    description?: string;
    avatar?: string;
    likeCount?: number;
    viewer?: Extensible;
} & Extensible;

export type StarterPackRecord = {
    name?: string;
    description?: string;
    list?: string;
} & Extensible;

export type StarterPackView = {
    uri: string;
    cid?: string;
    record: StarterPackRecord;
    creator?: ProfileViewBasic;
    list?: ListView;
    feeds?: GeneratorView[];
    listItemsSample?: ListItemView[];
} & Extensible;

export type Preference = {
    $type: string;
    [k: string]: any;
};

export type RepoRecordEnvelope = {
    uri: string;
    cid?: string;
    value: Extensible;
};

export type BlobRef = {
    $type?: string;
    ref: Extensible;
    mimeType: string;
    size: number;
} & Extensible;

export type LikeView = {
    actor: ProfileView;
    createdAt?: string;
    indexedAt?: string;
} & Extensible;
