import type {Column} from "$lib/types/column";
import {getContext, setContext} from "svelte";
import {accountsDb} from "$lib/db";
import type {pulseReaction} from "$lib/components/post/reactionPulse.svelte";
import {AppBskyFeedDefs} from "@atproto/api";
import {settingsState} from "$lib/classes/settingsState.svelte";
import {appState} from "$lib/classes/appState.svelte";

export class ColumnState {
    columns = $state<Column[]>([]);
    syncColumns = $derived(this.columns.map(({ scrollElement, data, ...rest }) => ({
        ...rest,
        data: {
            feed: !settingsState?.settings?.markedUnread ? [] : data?.notifications ? [] : data?.feed || [],
            cursor: !settingsState?.settings?.markedUnread ? '' : data?.notifications ? '' : data?.cursor || '',
        }
    })));
    isColumnsLoaded = $state(false);

    constructor(isJunk: boolean = false) {
       if (isJunk) {
            $effect(() => {
                if (this.columns.length > 20) {
                    this.columns.shift();
                }
            })

            return;
        }

        accountsDb.profiles.get(appState.profile.current)
          .then(res => {
              this.columns = res?.columns || [];
              this.isColumnsLoaded = true;
        });

        $effect(() => {
            if (this.isColumnsLoaded) {
                accountsDb.profiles.update(appState.profile.current, {
                    columns: $state.snapshot(this.syncColumns),
                });
            }
        });
    }

    add(column: Column) {
        this.columns.push(column)
    }

    remove(id: string) {
        this.columns = this.columns.filter(column => column.id !== id);
    }

    removeAll() {
        this.columns.length = 0;
    }

    getColumn(index: number) {
        return this.columns[index];
    }

    hasColumn(id: string) {
        return this.columns.some(column => column.id === id);
    }

    getColumnIndex(id: string) {
        return this.columns.findIndex(column => column.id === id);
    }

    updateLike(pulse: pulseReaction) {
        if (!pulse) {
            return;
        }

        try {
            this.columns.forEach(column => {
                const feed = column?.algorithm?.type === 'notification' ? column?.data?.feedPool : column?.data?.feed;
                if (!feed) return;

                const did = column.did;

                feed.forEach((item: AppBskyFeedDefs.FeedViewPost) => {
                    const postsToCheck = [
                        item?.post,
                        item?.reply?.parent,
                        item?.reply?.root
                    ].filter(post => post?.uri === pulse.uri);

                    postsToCheck.forEach(post => {
                        if (post) {
                            post.likeCount = pulse.count;
                            post.viewer = {
                                ...post.viewer,
                                like: did === pulse.did ? pulse.viewer : post.viewer?.like
                            };
                        }
                    });
                });
            });
        } catch (e) {
            console.error(e);
        }
    }

    updateRepost(pulse: pulseReaction) {
        if (!pulse) {
            return;
        }

        try {
            this.columns.forEach(column => {
                const feed = column?.algorithm?.type === 'notification' ? column?.data?.feedPool : column?.data?.feed;
                if (!feed) return;

                const did = column.did;

                feed.forEach((item: AppBskyFeedDefs.FeedViewPost) => {
                    const postsToCheck = [
                        item?.post,
                        item?.reply?.parent,
                        item?.reply?.root
                    ].filter(post => post?.uri === pulse.uri);

                    postsToCheck.forEach(post => {
                        if (post) {
                            post.repostCount = pulse.count;
                            post.viewer = {
                                ...post.viewer,
                                repost: did === pulse.did ? pulse.viewer : post.viewer?.repost
                            };
                        }
                    });
                });
            });
        } catch (e) {
            console.error(e);
        }
    }

    deletePost(uri: string) {
        if (!uri) {
            return;
        }

        try {
            this.columns.forEach(column => {
                if (column?.algorithm?.type === 'notification') {
                    column.data.feedPool = column.data.feedPool.filter((data: AppBskyFeedDefs.FeedViewPost) => data?.post?.uri !== uri);
                } else {
                    column.data.feed = column.data.feed.filter((data: AppBskyFeedDefs.FeedViewPost) => data?.post?.uri !== uri);
                }
            });
        } catch (e) {
            console.error(e);
        }
    }

    deletePostsFromDid(did: string) {
        if (!did) {
            return;
        }

        try {
            this.columns.forEach(column => {
                if (column?.algorithm?.type === 'notification') {
                    column.data.feedPool = column.data.feedPool.filter((data: AppBskyFeedDefs.FeedViewPost) => data?.post?.author?.did !== did);
                } else {
                    column.data.feed = column.data.feed.filter((data: AppBskyFeedDefs.FeedViewPost) => data?.post?.author?.did !== did);
                }
            });
        } catch (e) {
            console.error(e);
        }
    }
}

const ColumnUnique = Symbol();
const JunkColumnUnique = Symbol('junk');

export function initColumns() {
    setColumnState(false);
    setColumnState(true);
}

export function setColumnState(isJunk: boolean = false) {
    return setContext(isJunk ? JunkColumnUnique : ColumnUnique, new ColumnState(isJunk));
}

export function getColumnState(isJunk: boolean = false) {
    return getContext<ReturnType<typeof setColumnState>>(isJunk ? JunkColumnUnique : ColumnUnique);
}
