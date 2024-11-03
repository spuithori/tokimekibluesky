import type {AppBskyFeedDefs} from "@atproto/api";

type replyRef = {
    did: string,
    data: AppBskyFeedDefs.ReplyRef | string | undefined
} | undefined;

class PostState {
    quote = $state<AppBskyFeedDefs.PostView | undefined>();
    reply = $state<replyRef>();
}
export const postState = new PostState();