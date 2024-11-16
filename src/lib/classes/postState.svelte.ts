import type {AppBskyFeedDefs} from "@atproto/api";

type replyRef = {
    did: string,
    data: AppBskyFeedDefs.ReplyRef | string | undefined
} | undefined;

class PostState {
    quote = $state<AppBskyFeedDefs.PostView | undefined>();
    reply = $state<replyRef>();
    quotePulse = $state<Symbol | undefined>();
    replyPulse = $state<Symbol | undefined>();
}
export const postState = new PostState();