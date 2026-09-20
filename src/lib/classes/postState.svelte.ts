import {getContext, setContext} from "svelte";
import {PersistedState} from "runed";
import {textToJson} from "$lib/components/editor/richtext";

type replyRef = {
    did: string,
    data: any | string | undefined
} | undefined;

type ThreadGate = 'everybody' | 'nobody' | string[];

export type WhisperDuration = '10m' | '30m' | '1h' | '6h' | '12h' | '24h' | undefined;

export type PollDuration = '5m' | '1h' | '6h' | '12h' | '1d' | '3d' | '7d';

export type Poll = {
    options: string[];
    duration: PollDuration;
} | undefined;

type Post = {
    text: string,
    json: any,
    images: any[],
    video: any,
    externalImageBlob: string | undefined,
    lang: string[] | undefined,
    links: string[],
    quotePost: any | undefined,
    replyRef: replyRef,
    selfLabels: any[],
    threadGate: ThreadGate,
    postGate: boolean,
    whisper: WhisperDuration,
    poll: Poll,
}

export class PostState {
    index = $state<number>(0);
    posts = $state<Post[] | undefined>();
    #opener: (() => void) | undefined;
    #editor: (() => void) | undefined;

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
        whisper: undefined,
        poll: undefined,
    });

    constructor() {
        this.posts = [$state.snapshot(this.initPost)];
    }

    getPost(index: number) {
        return this.posts[index];
    }

    provideOpener(opener: () => void) {
        this.#opener = opener;

        return () => {
            if (this.#opener === opener) {
                this.#opener = undefined;
            }
        };
    }

    requestOpen() {
        this.#opener?.();
    }

    provideEditor(apply: () => void) {
        this.#editor = apply;

        return () => {
            if (this.#editor === apply) {
                this.#editor = undefined;
            }
        };
    }

    replaceText(html: string) {
        this.posts[this.index].text = html;
        this.posts[this.index].json = '';
        this.#editor?.();
        this.requestOpen();
    }

    replacePlainText(text: string) {
        this.posts[this.index].text = text;
        this.posts[this.index].json = textToJson(text);
        this.#editor?.();
        this.requestOpen();
    }

    replacePost(post) {
        this.posts[this.index] = {
            ...$state.snapshot(this.initPost),
            ...post,
        };
        this.requestOpen();
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
                    json: textToJson(text),
                });
            } else {
                newPosts.push({
                    ...$state.snapshot(this.initPost),
                    text: text,
                    json: textToJson(text),
                    replyRef: currentPost.replyRef,
                    threadGate: currentPost.threadGate,
                    postGate: currentPost.postGate,
                    lang: currentPost.lang,
                    whisper: currentPost.whisper,
                });
            }
        });

        const beforePosts = this.posts.slice(0, this.index);
        const afterPosts = this.posts.slice(this.index + 1);
        this.posts = [...beforePosts, ...newPosts, ...afterPosts];
        this.requestOpen();
    }
}

const PostUnique = Symbol();

export function setPostState() {
    return setContext(PostUnique, new PostState());
}

export function getPostState() {
    return getContext<ReturnType<typeof setPostState>>(PostUnique);
}