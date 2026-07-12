import type {Column} from "$lib/types/column";
import {getContext, setContext} from "svelte";
import {SvelteMap} from "svelte/reactivity";
import {accountsDb} from "$lib/db";
import type {pulseReaction} from "$lib/components/post/reactionPulse.svelte";
import {AppBskyFeedDefs} from "$lib/atproto-guards";
import {settingsState} from "$lib/classes/settingsState.svelte";
import {appState} from "$lib/classes/appState.svelte";
import {clearAllNotificationLedgers, deleteNotificationLedger, moveNotificationLedger, resetNotificationLedger} from "$lib/components/notification/notificationLedger";

export class ColumnState {
    columns = $state<Column[]>([]);
    isReordering = $state(false);
    private _feeds = new SvelteMap<string, any[]>();
    private _feedStatus = $state.raw<Record<string, string>>({});

    getFeed(columnId: string): any[] {
        return this._feeds.get(columnId) ?? [];
    }

    getFeedStatus(columnId: string): string | undefined {
        return this._feedStatus[columnId];
    }

    setFeedStatus(columnId: string, status: string): void {
        this._feedStatus = { ...this._feedStatus, [columnId]: status };
    }

    clearFeedStatus(columnId: string): void {
        const { [columnId]: _, ...rest } = this._feedStatus;
        this._feedStatus = rest;
    }

    setFeed(columnId: string, feed: any[]): void {
        this._feeds.set(columnId, feed);
        if (this._feedStatus[columnId]) this.clearFeedStatus(columnId);
    }

    updateFeed(columnId: string, fn: (feed: any[]) => void): void {
        const feed = (this._feeds.get(columnId) ?? []).slice();
        fn(feed);
        this._feeds.set(columnId, feed);
    }

    replaceFeed(columnId: string, fn: (feed: any[]) => any[]): void {
        const feed = this._feeds.get(columnId) ?? [];
        this._feeds.set(columnId, fn(feed));
    }

    clearFeed(columnId: string): void {
        this._feeds.set(columnId, []);
        if (this._feedStatus[columnId]) this.clearFeedStatus(columnId);
    }

    deleteFeed(columnId: string): void {
        this._feeds.delete(columnId);
    }

    syncColumns = $derived(this.columns.map(({ scrollElement, data, splitColumn, ...rest }) => ({
        ...rest,
        data: {
            feed: !settingsState?.settings?.markedUnread ? [] : rest.algorithm?.type === 'notification' ? [] : this._feeds.get(rest.id) ?? [],
            cursor: !settingsState?.settings?.markedUnread ? '' : rest.algorithm?.type === 'notification' ? '' : data?.cursor || '',
        },
        ...(splitColumn ? {
            splitColumn: {
                ...(() => {
                    const { scrollElement: splitScrollElement, data: splitData, ...splitRest } = splitColumn;
                    return {
                        ...splitRest,
                        data: {
                            feed: !settingsState?.settings?.markedUnread ? [] : splitRest.algorithm?.type === 'notification' ? [] : this._feeds.get(splitRest.id) ?? [],
                            cursor: !settingsState?.settings?.markedUnread ? '' : splitRest.algorithm?.type === 'notification' ? '' : splitData?.cursor || '',
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
                    const removed = this.columns.shift();
                    if (removed) {
                        this.deleteFeed(removed.id);
                        this.clearFeedStatus(removed.id);
                        deleteNotificationLedger(removed.id);
                    }
                }
            })

            return;
        }

        accountsDb.profiles.get(appState.profile.current)
          .then(res => {
              const cols = res?.columns || [];
              const feedEntries: Record<string, any[]> = {};
              for (const col of cols) {
                  if (col.data) col.data.scrollState = undefined;
                  if (col.data?.feed?.length > 0 && col.id) {
                      feedEntries[col.id] = col.data.feed;
                      col.data.feed = [];
                  }
                  if ((col as any).splitColumn?.data) {
                      (col as any).splitColumn.data.scrollState = undefined;
                      if ((col as any).splitColumn.data?.feed?.length > 0 && (col as any).splitColumn.id) {
                          feedEntries[(col as any).splitColumn.id] = (col as any).splitColumn.data.feed;
                          (col as any).splitColumn.data.feed = [];
                      }
                  }
              }
              for (const [id, feed] of Object.entries(feedEntries)) {
                  this._feeds.set(id, feed);
              }
              this.columns = cols;
              this.isColumnsLoaded = true;
        });

        $effect(() => {
            if (!this.isColumnsLoaded || this.isReordering) return;

            accountsDb.profiles.update(appState.profile.current, {
                columns: $state.snapshot(this.syncColumns),
            });
        });
    }

    add(column: Column) {
        if (column.data?.feed?.length > 0 && column.id) {
            this._feeds.set(column.id, column.data.feed);
            column.data.feed = [];
        }
        this.columns.push(column)
    }

    remove(id: string) {
        this.deleteFeed(id);
        this.clearFeedStatus(id);
        deleteNotificationLedger(id);
        this.columns = this.columns.filter(column => column.id !== id);
    }

    removeAll() {
        for (const column of this.columns) {
            deleteNotificationLedger(column.id);
        }
        this.columns.length = 0;
        this._feeds.clear();
        this._feedStatus = {};
    }

    replaceAllColumns(columns: Column[]) {
        clearAllNotificationLedgers();
        this.columns = columns;
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
            const oldSplitId = column.splitColumn.id;
            if (keepAsSeparate) {
                const splitColumn = { ...column.splitColumn };
                const newId = self.crypto.randomUUID();
                splitColumn.id = newId;
                this.setFeed(newId, [...this.getFeed(oldSplitId)]);
                moveNotificationLedger(oldSplitId, newId);
                this.columns.splice(index + 1, 0, splitColumn);
            } else {
                deleteNotificationLedger(oldSplitId);
            }
            this.deleteFeed(oldSplitId);
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
            };
            this.clearFeed(column.id);
            resetNotificationLedger(column.id);

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
            };
            this.clearFeed(column.splitColumn.id);
            resetNotificationLedger(column.splitColumn.id);
        }
    }

    private updateLikeForColumn(column: Column, pulse: pulseReaction, targetUri: string) {
        const feed = this.getFeed(column.id);
        if (!feed.length) return;

        const did = column.did;
        const isOwner = did === pulse.did;

        function patchItem(item: any): { patched: any; found: boolean } {
            let found = false;
            let newItem = item;

            if (item?.post?.uri === targetUri) {
                newItem = {
                    ...newItem,
                    post: {
                        ...newItem.post,
                        likeCount: pulse.count,
                        viewer: {
                            ...newItem.post.viewer,
                            like: isOwner ? pulse.viewer : newItem.post.viewer?.like,
                        },
                    },
                };
                found = true;
            }
            if (item?.reply?.parent?.uri === targetUri) {
                newItem = {
                    ...newItem,
                    reply: {
                        ...newItem.reply,
                        parent: {
                            ...newItem.reply.parent,
                            likeCount: pulse.count,
                            viewer: {
                                ...newItem.reply.parent.viewer,
                                like: isOwner ? pulse.viewer : newItem.reply.parent.viewer?.like,
                            },
                        },
                    },
                };
                found = true;
            }
            if (item?.reply?.root?.uri === targetUri) {
                const existingReply = newItem.reply ?? item.reply;
                newItem = {
                    ...newItem,
                    reply: {
                        ...existingReply,
                        root: {
                            ...existingReply.root,
                            likeCount: pulse.count,
                            viewer: {
                                ...existingReply.root.viewer,
                                like: isOwner ? pulse.viewer : existingReply.root.viewer?.like,
                            },
                        },
                    },
                };
                found = true;
            }

            return { patched: newItem, found };
        }

        let mutated = false;
        const newFeed = feed.map(item => {
            const { patched, found } = patchItem(item);
            if (found) mutated = true;
            return found ? patched : item;
        });
        if (mutated) {
            this._feeds.set(column.id, newFeed);
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
        const feed = this.getFeed(column.id);
        if (!feed.length) return;

        const did = column.did;
        const isOwner = did === pulse.did;

        function patchItem(item: any): { patched: any; found: boolean } {
            let found = false;
            let newItem = item;

            if (item?.post?.uri === targetUri) {
                newItem = {
                    ...newItem,
                    post: {
                        ...newItem.post,
                        repostCount: pulse.count,
                        viewer: {
                            ...newItem.post.viewer,
                            repost: isOwner ? pulse.viewer : newItem.post.viewer?.repost,
                        },
                    },
                };
                found = true;
            }
            if (item?.reply?.parent?.uri === targetUri) {
                newItem = {
                    ...newItem,
                    reply: {
                        ...newItem.reply,
                        parent: {
                            ...newItem.reply.parent,
                            repostCount: pulse.count,
                            viewer: {
                                ...newItem.reply.parent.viewer,
                                repost: isOwner ? pulse.viewer : newItem.reply.parent.viewer?.repost,
                            },
                        },
                    },
                };
                found = true;
            }
            if (item?.reply?.root?.uri === targetUri) {
                const existingReply = newItem.reply ?? item.reply;
                newItem = {
                    ...newItem,
                    reply: {
                        ...existingReply,
                        root: {
                            ...existingReply.root,
                            repostCount: pulse.count,
                            viewer: {
                                ...existingReply.root.viewer,
                                repost: isOwner ? pulse.viewer : existingReply.root.viewer?.repost,
                            },
                        },
                    },
                };
                found = true;
            }

            return { patched: newItem, found };
        }

        let mutated = false;
        const newFeed = feed.map(item => {
            const { patched, found } = patchItem(item);
            if (found) mutated = true;
            return found ? patched : item;
        });
        if (mutated) {
            this._feeds.set(column.id, newFeed);
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
        this.replaceFeed(column.id, f => f.filter((data: AppBskyFeedDefs.FeedViewPost) => data?.post?.uri !== uri));
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
        this.replaceFeed(column.id, f => f.filter((data: AppBskyFeedDefs.FeedViewPost) => data?.post?.author?.did !== did));
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
