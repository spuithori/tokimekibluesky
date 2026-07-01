import type {Column} from "$lib/types/column";
import {type Slot, type LayoutNode, loadDeckState, splitLeaf, splitLeafWithExisting, moveLeafToSplit, moveLeafToSlot, unsplitAt, swapAt, slotIndexOfColumn, flattenLeafIds, DECK_SCHEMA_VERSION} from "$lib/classes/deckLayout";
import {getContext, setContext} from "svelte";
import {SvelteMap} from "svelte/reactivity";
import {accountsDb} from "$lib/db";
import type {pulseReaction} from "$lib/components/post/reactionPulse.svelte";
import {AppBskyFeedDefs} from "$lib/atproto-guards";
import {settingsState} from "$lib/classes/settingsState.svelte";
import {appState} from "$lib/classes/appState.svelte";

export class ColumnState {
    columns = $state<Column[]>([]);
    slots = $state<Slot[]>([]);
    isReordering = $state(false);
    floatingOrder = $state<string[]>([]);
    activeFloatingId = $state<string | null>(null);
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

    registerFloating(id: string): void {
        if (!this.floatingOrder.includes(id)) this.floatingOrder = [...this.floatingOrder, id];
    }

    unregisterFloating(id: string): void {
        this.floatingOrder = this.floatingOrder.filter(x => x !== id);
        if (this.activeFloatingId === id) this.activeFloatingId = null;
    }

    raiseFloating(id: string): void {
        this.floatingOrder = [...this.floatingOrder.filter(x => x !== id), id];
        this.activeFloatingId = id;
    }

    syncColumns = $derived(this.columns.map(({ scrollElement, data, ...rest }) => ({
        ...rest,
        data: {
            feed: !settingsState?.settings?.markedUnread ? [] : data?.notifications ? [] : this._feeds.get(rest.id) ?? [],
            cursor: !settingsState?.settings?.markedUnread ? '' : data?.notifications ? '' : data?.cursor || '',
        },
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
              const { columns, slots } = loadDeckState(
                  { version: (res as any)?.deckVersion, columns: res?.columns, slots: (res as any)?.slots },
                  () => self.crypto.randomUUID(),
              );
              const feedEntries: Record<string, any[]> = {};
              for (const col of columns) {
                  if (col.data) (col.data as any).scrollState = undefined;
                  if ((col.data?.feed?.length ?? 0) > 0 && col.id) {
                      feedEntries[col.id] = col.data.feed as any[];
                      col.data.feed = [];
                  }
              }
              for (const [id, feed] of Object.entries(feedEntries)) {
                  this._feeds.set(id, feed);
              }
              this.columns = columns;
              this.slots = slots;
              this.isColumnsLoaded = true;
        });

        $effect(() => {
            if (!this.isColumnsLoaded || this.isReordering) return;

            accountsDb.profiles.update(appState.profile.current, {
                columns: $state.snapshot(this.syncColumns),
                slots: $state.snapshot(this.slots),
                deckVersion: DECK_SCHEMA_VERSION,
            } as any);
        });
    }

    add(column: Column) {
        if ((column.data?.feed?.length ?? 0) > 0 && column.id) {
            this._feeds.set(column.id, column.data.feed as any[]);
            column.data.feed = [];
        }
        this.columns.push(column);
        this.slots.push({ id: self.crypto.randomUUID(), layout: { type: 'leaf', columnId: column.id } });
    }

    remove(id: string) {
        this.deleteFeed(id);
        this.clearFeedStatus(id);
        const slotIndex = slotIndexOfColumn(this.slots, id);
        if (slotIndex === -1) {
            this.columns = this.columns.filter(column => column.id !== id);
            return;
        }
        const next = unsplitAt({ columns: this.columns, slots: this.slots }, slotIndex, id, false, () => self.crypto.randomUUID());
        this.columns = next.columns;
        this.slots = next.slots;
    }

    removeAll() {
        this.columns.length = 0;
        this.slots.length = 0;
        this._feeds.clear();
        this._feedStatus = {};
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

    slotIndexOf(columnId: string) {
        return slotIndexOfColumn(this.slots, columnId);
    }

    getSlot(slotIndex: number) {
        return this.slots[slotIndex];
    }

    leafIdsOf(slotIndex: number): string[] {
        const slot = this.slots[slotIndex];
        return slot ? flattenLeafIds(slot.layout) : [];
    }

    getSlotColumn(slotIndex: number): Column | undefined {
        const ids = this.leafIdsOf(slotIndex);
        return ids.length ? this.columns.find(c => c.id === ids[0]) : undefined;
    }

    splitColumnAt(leafColumnId: string, newColumn: Column, direction: 'row' | 'column' = 'column') {
        const slotIndex = slotIndexOfColumn(this.slots, leafColumnId);
        if (slotIndex === -1) return;
        if ((newColumn.data?.feed?.length ?? 0) > 0 && newColumn.id) {
            this._feeds.set(newColumn.id, newColumn.data.feed as any[]);
            newColumn.data.feed = [];
        }
        const next = splitLeaf({ columns: this.columns, slots: this.slots }, leafColumnId, newColumn, direction);
        this.columns = next.columns;
        this.slots = next.slots;
    }

    unsplitColumnAt(leafColumnId: string, keepAsSeparate: boolean) {
        const slotIndex = slotIndexOfColumn(this.slots, leafColumnId);
        if (slotIndex === -1) return;
        if (!keepAsSeparate) {
            this.deleteFeed(leafColumnId);
            this.clearFeedStatus(leafColumnId);
        }
        const next = unsplitAt({ columns: this.columns, slots: this.slots }, slotIndex, leafColumnId, keepAsSeparate, () => self.crypto.randomUUID());
        this.columns = next.columns;
        this.slots = next.slots;
    }

    swapSplitColumn(leafColumnId: string) {
        const slotIndex = slotIndexOfColumn(this.slots, leafColumnId);
        if (slotIndex === -1) return;
        const next = swapAt({ columns: this.columns, slots: this.slots }, slotIndex);
        this.columns = next.columns;
        this.slots = next.slots;
    }

    mergeColumnIntoSplit(targetLeafColumnId: string, sourceColumnId: string, direction: 'row' | 'column' = 'column') {
        const slotIndex = slotIndexOfColumn(this.slots, targetLeafColumnId);
        if (slotIndex === -1) return;
        const next = splitLeafWithExisting({ columns: this.columns, slots: this.slots }, targetLeafColumnId, sourceColumnId, direction);
        this.columns = next.columns;
        this.slots = next.slots;
    }

    moveLeafToSplit(sourceColumnId: string, targetColumnId: string, direction: 'row' | 'column' = 'column', sourceFirst = false) {
        const next = moveLeafToSplit({ columns: this.columns, slots: this.slots }, sourceColumnId, targetColumnId, direction, sourceFirst);
        this.columns = next.columns;
        this.slots = next.slots;
    }

    moveLeafToSlot(sourceColumnId: string, slotIndex: number) {
        const next = moveLeafToSlot({ columns: this.columns, slots: this.slots }, sourceColumnId, slotIndex, () => self.crypto.randomUUID());
        this.columns = next.columns;
        this.slots = next.slots;
    }

    isInSplit(columnId: string): boolean {
        const slotIndex = slotIndexOfColumn(this.slots, columnId);
        return slotIndex !== -1 && flattenLeafIds(this.slots[slotIndex].layout).length > 1;
    }

    setNodeSizes(node: LayoutNode, sizes: number[]) {
        if (node && node.type === 'split') {
            node.sizes = sizes;
        }
    }

    private updateLikeForColumn(column: Column, pulse: pulseReaction, targetUri: string) {
        const isNotification = column?.algorithm?.type === 'notification';
        const feed = isNotification ? column?.data?.feedPool : this.getFeed(column.id);
        if (!feed) return;

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

        if (isNotification) {
            for (let i = 0; i < feed.length; i++) {
                const { patched, found } = patchItem(feed[i]);
                if (found) {
                    feed[i] = patched;
                }
            }
        } else {
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
    }

    updateLike(pulse: pulseReaction) {
        if (!pulse) {
            return;
        }

        const targetUri = pulse.uri;

        try {
            for (const column of this.columns) {
                this.updateLikeForColumn(column, pulse, targetUri);
            }
        } catch (e) {
            console.error(e);
        }
    }

    private updateRepostForColumn(column: Column, pulse: pulseReaction, targetUri: string) {
        const isNotification = column?.algorithm?.type === 'notification';
        const feed = isNotification ? column?.data?.feedPool : this.getFeed(column.id);
        if (!feed) return;

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

        if (isNotification) {
            for (let i = 0; i < feed.length; i++) {
                const { patched, found } = patchItem(feed[i]);
                if (found) {
                    feed[i] = patched;
                }
            }
        } else {
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
    }

    updateRepost(pulse: pulseReaction) {
        if (!pulse) {
            return;
        }

        const targetUri = pulse.uri;

        try {
            for (const column of this.columns) {
                this.updateRepostForColumn(column, pulse, targetUri);
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
            this.replaceFeed(column.id, f => f.filter((data: AppBskyFeedDefs.FeedViewPost) => data?.post?.uri !== uri));
        }
    }

    deletePost(uri: string) {
        if (!uri) {
            return;
        }

        try {
            this.columns.forEach(column => {
                this.deletePostForColumn(column, uri);
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
            this.replaceFeed(column.id, f => f.filter((data: AppBskyFeedDefs.FeedViewPost) => data?.post?.author?.did !== did));
        }
    }

    deletePostsFromDid(did: string) {
        if (!did) {
            return;
        }

        try {
            this.columns.forEach(column => {
                this.deletePostsFromDidForColumn(column, did);
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
