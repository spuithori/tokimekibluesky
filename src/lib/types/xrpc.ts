import type {
    Extensible,
    FeedPage,
    GeneratorView,
    LikeView,
    ListItemView,
    ListView,
    PostView,
    Preference,
    ProfileViewBasic,
    ProfileViewDetailed,
    RepoRecordEnvelope,
    StarterPackView,
    ThreadViewPost,
    BlobRef,
} from "$lib/types/atproto";
import type {ChatMessageView, ConvoView} from "$lib/components/chat/chatTypes";
import type {NotificationView} from "$lib/components/notification/notificationPipeline";

export interface XrpcGetMap {
    'app.bsky.actor.getProfile': {
        params: { actor: string };
        output: ProfileViewDetailed;
    };
    'app.bsky.actor.getProfiles': {
        params: { actors: string[] };
        output: { profiles: ProfileViewDetailed[] };
    };
    'app.bsky.actor.searchActorsTypeahead': {
        params: { term?: string; q?: string; limit?: number };
        output: { actors: ProfileViewBasic[] };
    };
    'app.bsky.actor.getPreferences': {
        params: Record<string, never>;
        output: { preferences: Preference[] };
    };
    'app.bsky.graph.getList': {
        params: { list: string; limit?: number; cursor?: string };
        output: { list: ListView; items: ListItemView[]; cursor?: string };
    };
    'app.bsky.graph.getLists': {
        params: { actor: string; limit?: number; cursor?: string };
        output: { lists: ListView[]; cursor?: string };
    };
    'app.bsky.graph.getStarterPack': {
        params: { starterPack: string };
        output: { starterPack: StarterPackView };
    };
    'app.bsky.feed.getPostThread': {
        params: { uri: string; depth?: number; parentHeight?: number };
        output: { thread: ThreadViewPost; threadgate?: Extensible };
    };
    'app.bsky.feed.getTimeline': {
        params: { algorithm?: string; limit?: number; cursor?: string };
        output: FeedPage;
    };
    'app.bsky.feed.getAuthorFeed': {
        params: { actor: string; limit?: number; cursor?: string; filter?: string; includePins?: boolean };
        output: FeedPage;
    };
    'app.bsky.feed.getListFeed': {
        params: { list: string; limit?: number; cursor?: string };
        output: FeedPage;
    };
    'app.bsky.feed.getFeed': {
        params: { feed: string; limit?: number; cursor?: string };
        output: FeedPage;
    };
    'app.bsky.feed.getPosts': {
        params: { uris: string[] };
        output: { posts: PostView[] };
    };
    'app.bsky.feed.getLikes': {
        params: { uri: string; limit?: number; cursor?: string };
        output: { likes: LikeView[]; cursor?: string; uri?: string };
    };
    'app.bsky.feed.getFeedGenerator': {
        params: { feed: string };
        output: { view: GeneratorView; isOnline?: boolean; isValid?: boolean };
    };
    'app.bsky.feed.getFeedGenerators': {
        params: { feeds: string[] };
        output: { feeds: GeneratorView[] };
    };
    'app.bsky.unspecced.getPopularFeedGenerators': {
        params: { query?: string; limit?: number; cursor?: string };
        output: { feeds: GeneratorView[]; cursor?: string };
    };
    'app.bsky.notification.listNotifications': {
        params: { limit?: number; cursor?: string; reasons?: string[]; priority?: boolean };
        output: { notifications: NotificationView[]; cursor?: string; seenAt?: string; priority?: boolean };
    };
    'com.atproto.repo.listRecords': {
        params: { collection: string; repo: string; limit?: number; cursor?: string | number; reverse?: boolean | string };
        output: { records: RepoRecordEnvelope[]; cursor?: string };
    };
    'com.atproto.repo.getRecord': {
        params: { repo: string; collection: string; rkey: string; cid?: string };
        output: RepoRecordEnvelope;
    };
    'com.atproto.identity.resolveHandle': {
        params: { handle: string };
        output: { did: string };
    };
    'com.atproto.sync.getBlob': {
        params: { did: string; cid: string };
        output: ArrayBuffer;
    };
    'chat.bsky.convo.listConvos': {
        params: { limit?: number; cursor?: string; status?: string; readState?: string };
        output: { convos: ConvoView[]; cursor?: string };
    };
    'chat.bsky.convo.getMessages': {
        params: { convoId: string; limit?: number; cursor?: string | number };
        output: { messages: ChatMessageView[]; cursor?: string };
    };
    'chat.bsky.convo.getLog': {
        params: { cursor?: string };
        output: { logs: Extensible[]; cursor?: string };
    };
}

export interface XrpcPostMap {
    'com.atproto.repo.createRecord': {
        input: { repo: string; collection: string; rkey?: string; record: Extensible; validate?: boolean; swapCommit?: string };
        output: { uri: string; cid: string } & Extensible;
    };
    'com.atproto.repo.putRecord': {
        input: { repo: string; collection: string; rkey: string; record: Extensible; validate?: boolean; swapRecord?: string; swapCommit?: string };
        output: { uri: string; cid: string } & Extensible;
    };
    'com.atproto.repo.deleteRecord': {
        input: { repo: string; collection: string; rkey: string; swapRecord?: string; swapCommit?: string };
        output: Extensible;
    };
    'com.atproto.repo.applyWrites': {
        input: { repo: string; writes: Extensible[]; validate?: boolean };
        output: Extensible;
    };
    'com.atproto.repo.uploadBlob': {
        input: Blob | Uint8Array | ArrayBuffer;
        output: { blob: BlobRef };
    };
    'chat.bsky.convo.sendMessage': {
        input: { convoId: string; message: Extensible };
        output: ChatMessageView;
    };
    'chat.bsky.convo.updateRead': {
        input: { convoId: string; messageId?: string };
        output: Extensible;
    };
}
