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

        const targetUri = pulse.uri;

        try {
            for (const column of this.columns) {
                const feed = column?.algorithm?.type === 'notification' ? column?.data?.feedPool : column?.data?.feed;
                if (!feed) continue;

                const did = column.did;
                const isOwner = did === pulse.did;

                for (const item of feed as AppBskyFeedDefs.FeedViewPost[]) {
                    if (item?.post?.uri === targetUri) {
                        item.post.likeCount = pulse.count;
                        item.post.viewer = {
                            ...item.post.viewer,
                            like: isOwner ? pulse.viewer : item.post.viewer?.like
                        };
                    }
                    if (item?.reply?.parent?.uri === targetUri) {
                        item.reply.parent.likeCount = pulse.count;
                        item.reply.parent.viewer = {
                            ...item.reply.parent.viewer,
                            like: isOwner ? pulse.viewer : item.reply.parent.viewer?.like
                        };
                    }
                    if (item?.reply?.root?.uri === targetUri) {
                        item.reply.root.likeCount = pulse.count;
                        item.reply.root.viewer = {
                            ...item.reply.root.viewer,
                            like: isOwner ? pulse.viewer : item.reply.root.viewer?.like
                        };
                    }
                }
            }
        } catch (e) {
            console.error(e);
        }
    }

    updateRepost(pulse: pulseReaction) {
        if (!pulse) {
            return;
        }

        const targetUri = pulse.uri;

        try {
            for (const column of this.columns) {
                const feed = column?.algorithm?.type === 'notification' ? column?.data?.feedPool : column?.data?.feed;
                if (!feed) continue;

                const did = column.did;
                const isOwner = did === pulse.did;

                for (const item of feed as AppBskyFeedDefs.FeedViewPost[]) {
                    if (item?.post?.uri === targetUri) {
                        item.post.repostCount = pulse.count;
                        item.post.viewer = {
                            ...item.post.viewer,
                            repost: isOwner ? pulse.viewer : item.post.viewer?.repost
                        };
                    }
                    if (item?.reply?.parent?.uri === targetUri) {
                        item.reply.parent.repostCount = pulse.count;
                        item.reply.parent.viewer = {
                            ...item.reply.parent.viewer,
                            repost: isOwner ? pulse.viewer : item.reply.parent.viewer?.repost
                        };
                    }
                    if (item?.reply?.root?.uri === targetUri) {
                        item.reply.root.repostCount = pulse.count;
                        item.reply.root.viewer = {
                            ...item.reply.root.viewer,
                            repost: isOwner ? pulse.viewer : item.reply.root.viewer?.repost
                        };
                    }
                }
            }
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
