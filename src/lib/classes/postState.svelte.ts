import type {AppBskyFeedDefs} from "@atproto/api";
import {getContext, setContext} from "svelte";
import {PersistedState} from "runed";

type replyRef = {
    did: string,
    data: AppBskyFeedDefs.ReplyRef | string | undefined
} | undefined;

type ThreadGate = 'everybody' | 'nobody' | string[];

type Post = {
    text: string,
    json: string,
    images: any[],
    video: any,
    externalImageBlob: string | undefined,
    lang: string[] | undefined,
    links: string[],
    quotePost: AppBskyFeedDefs.PostView | undefined,
    replyRef: replyRef,
    selfLabels: any[],
    threadGate: ThreadGate,
    postGate: boolean,
}

export class PostState {
    index = $state<number>(0);
    posts = $state<Post[] | undefined>();
    pulse = $state(false);

    langs = new PersistedState('langs', 'auto');
    threadGate = new PersistedState('threadGate', 'everybody');
    postGate = new PersistedState('postGate', true);

    initPost: Post = $derived({
        text: '',
        json: '',
        images: [],
        video: undefined,
        externalImageBlob: undefined,
        lang: this.langs.current,
        links: [],
        quotePost: undefined,
        replyRef: undefined,
        selfLabels: [],
        threadGate: this.threadGate.current,
        postGate: this.postGate.current,
    });

    constructor() {
        this.posts = [$state.snapshot(this.initPost)];
    }

    getPost(index: number) {
        return this.posts[index];
    }

    replaceText(text: string) {
        this.posts[this.index].text = text;
        this.pulse = true;
    }

    replacePost(post) {
        this.posts[this.index] = post;
        this.pulse = true;
    }

    clearPosts() {
        this.posts = [$state.snapshot(this.initPost)];
        this.index = 0;
    }
}

const PostUnique = Symbol();

export function setPostState() {
    return setContext(PostUnique, new PostState());
}

export function getPostState() {
    return getContext<ReturnType<typeof setPostState>>(PostUnique);
}