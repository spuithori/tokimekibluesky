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
        this.posts[this.index] = {
            ...$state.snapshot(this.initPost),
            ...post,
        };
        this.pulse = true;
    }

    clearPosts() {
        this.posts = [$state.snapshot(this.initPost)];
        this.index = 0;
    }

    splitIntoThreads(texts: string[]) {
        if (!texts.length || !this.posts) return;

        const currentPost = this.posts[this.index];
        if (!currentPost) return;

        const newPosts: Post[] = [];

        texts.forEach((text, i) => {
            if (i === 0) {
                newPosts.push({
                    ...$state.snapshot(this.initPost),
                    ...currentPost,
                    text: text,
                    json: '',
                });
            } else {
                newPosts.push({
                    ...$state.snapshot(this.initPost),
                    text: text,
                    json: '',
                    replyRef: currentPost.replyRef,
                    threadGate: currentPost.threadGate,
                    postGate: currentPost.postGate,
                    lang: currentPost.lang,
                });
            }
        });

        const beforePosts = this.posts.slice(0, this.index);
        const afterPosts = this.posts.slice(this.index + 1);
        this.posts = [...beforePosts, ...newPosts, ...afterPosts];
        this.pulse = true;
    }
}

const PostUnique = Symbol();

export function setPostState() {
    return setContext(PostUnique, new PostState());
}

export function getPostState() {
    return getContext<ReturnType<typeof setPostState>>(PostUnique);
}