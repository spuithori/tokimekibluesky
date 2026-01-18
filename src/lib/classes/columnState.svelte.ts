import type {Column} from "$lib/types/column";
import {getContext, setContext} from "svelte";
import {accountsDb} from "$lib/db";
import type {pulseReaction} from "$lib/components/post/reactionPulse.svelte";
import {AppBskyFeedDefs} from "@atproto/api";
import {settingsState} from "$lib/classes/settingsState.svelte";
import {appState} from "$lib/classes/appState.svelte";

export class ColumnState {
    columns = $state<Column[]>([]);
    syncColumns = $derived(this.columns.map(({ scrollElement, data, splitColumn, ...rest }) => ({
        ...rest,
        data: {
            feed: !settingsState?.settings?.markedUnread ? [] : data?.notifications ? [] : data?.feed || [],
            cursor: !settingsState?.settings?.markedUnread ? '' : data?.notifications ? '' : data?.cursor || '',
        },
        ...(splitColumn ? {
            splitColumn: {
                ...(() => {
                    const { scrollElement: splitScrollElement, data: splitData, ...splitRest } = splitColumn;
                    return {
                        ...splitRest,
                        data: {
                            feed: !settingsState?.settings?.markedUnread ? [] : splitData?.notifications ? [] : splitData?.feed || [],
                            cursor: !settingsState?.settings?.markedUnread ? '' : splitData?.notifications ? '' : splitData?.cursor || '',
                        }
                    };
                })()
            }
        } : {})
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

    splitColumnAt(index: number, newColumn: Column) {
        const column = this.columns[index];
        if (column) {
            column.splitColumn = newColumn;
            column.splitRatio = column.splitRatio ?? 0.5;
        }
    }

    unsplitColumnAt(index: number, keepAsSeparate: boolean) {
        const column = this.columns[index];
        if (column && column.splitColumn) {
            if (keepAsSeparate) {
                const splitColumn = { ...column.splitColumn };
                splitColumn.id = self.crypto.randomUUID();
                this.columns.splice(index + 1, 0, splitColumn);
            }
            column.splitColumn = undefined;
            column.splitRatio = undefined;
        }
    }

    swapSplitColumn(index: number) {
        const column = this.columns[index];
        if (column && column.splitColumn) {
            const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

            const tempAlgorithm = deepClone(column.algorithm);
            const tempStyle = column.style;
            const tempDid = column.did;
            const tempHandle = column.handle;
            const tempUnreadCount = column.unreadCount;
            const tempFilter = column.filter ? deepClone(column.filter) : undefined;
            const tempLastRefresh = column.lastRefresh;
            const tempSettings = column.settings ? deepClone(column.settings) : {};

            column.algorithm = deepClone(column.splitColumn.algorithm);
            column.style = column.splitColumn.style;
            column.did = column.splitColumn.did;
            column.handle = column.splitColumn.handle;
            column.unreadCount = column.splitColumn.unreadCount;
            column.filter = column.splitColumn.filter ? deepClone(column.splitColumn.filter) : undefined;
            column.lastRefresh = column.splitColumn.lastRefresh;
            column.data = {
                feed: [],
                cursor: '',
                ...(column.splitColumn.algorithm?.type === 'notification' ? { feedPool: [], notifications: [] } : {})
            };

            column.splitColumn.algorithm = tempAlgorithm;
            column.splitColumn.style = tempStyle;
            column.splitColumn.did = tempDid;
            column.splitColumn.handle = tempHandle;
            column.splitColumn.unreadCount = tempUnreadCount;
            column.splitColumn.filter = tempFilter;
            column.splitColumn.lastRefresh = tempLastRefresh;
            column.splitColumn.settings = tempSettings;
            column.splitColumn.data = {
                feed: [],
                cursor: '',
                ...(tempAlgorithm?.type === 'notification' ? { feedPool: [], notifications: [] } : {})
            };
        }
    }

    private updateLikeForColumn(column: Column, pulse: pulseReaction, targetUri: string) {
        const feed = column?.algorithm?.type === 'notification' ? column?.data?.feedPool : column?.data?.feed;
        if (!feed) return;

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

    updateLike(pulse: pulseReaction) {
        if (!pulse) {
            return;
        }

        const targetUri = pulse.uri;

        try {
            for (const column of this.columns) {
                this.updateLikeForColumn(column, pulse, targetUri);

                if (column.splitColumn) {
                    this.updateLikeForColumn(column.splitColumn as Column, pulse, targetUri);
                }
            }
        } catch (e) {
            console.error(e);
        }
    }

    private updateRepostForColumn(column: Column, pulse: pulseReaction, targetUri: string) {
        const feed = column?.algorithm?.type === 'notification' ? column?.data?.feedPool : column?.data?.feed;
        if (!feed) return;

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

    updateRepost(pulse: pulseReaction) {
        if (!pulse) {
            return;
        }

        const targetUri = pulse.uri;

        try {
            for (const column of this.columns) {
                this.updateRepostForColumn(column, pulse, targetUri);

                if (column.splitColumn) {
                    this.updateRepostForColumn(column.splitColumn as Column, pulse, targetUri);
                }
            }
        } catch (e) {
            console.error(e);
        }
    }

    private deletePostForColumn(column: Column, uri: string) {
        if (column?.algorithm?.type === 'notification') {
            if (column.data?.feedPool) {
                column.data.feedPool = column.data.feedPool.filter((data: AppBskyFeedDefs.FeedViewPost) => data?.post?.uri !== uri);
            }
        } else {
            if (column.data?.feed) {
                column.data.feed = column.data.feed.filter((data: AppBskyFeedDefs.FeedViewPost) => data?.post?.uri !== uri);
            }
        }
    }

    deletePost(uri: string) {
        if (!uri) {
            return;
        }

        try {
            this.columns.forEach(column => {
                this.deletePostForColumn(column, uri);

                if (column.splitColumn) {
                    this.deletePostForColumn(column.splitColumn as Column, uri);
                }
            });
        } catch (e) {
            console.error(e);
        }
    }

    private deletePostsFromDidForColumn(column: Column, did: string) {
        if (column?.algorithm?.type === 'notification') {
            if (column.data?.feedPool) {
                column.data.feedPool = column.data.feedPool.filter((data: AppBskyFeedDefs.FeedViewPost) => data?.post?.author?.did !== did);
            }
        } else {
            if (column.data?.feed) {
                column.data.feed = column.data.feed.filter((data: AppBskyFeedDefs.FeedViewPost) => data?.post?.author?.did !== did);
            }
        }
    }

    deletePostsFromDid(did: string) {
        if (!did) {
            return;
        }

        try {
            this.columns.forEach(column => {
                this.deletePostsFromDidForColumn(column, did);

                if (column.splitColumn) {
                    this.deletePostsFromDidForColumn(column.splitColumn as Column, did);
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
