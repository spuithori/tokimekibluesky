import type {Column} from "$lib/types/column";
import {getContext, setContext} from "svelte";
import {accountsDb} from "$lib/db";
import type {pulseReaction} from "$lib/components/post/reactionPulse.svelte";
import {AppBskyFeedDefs} from "@atproto/api";

export class ColumnState {
    columns = $state<Column[]>([]);
    syncColumns = $derived(this.columns.map(({ scrollElement, data, ...rest }) => ({
        ...rest,
        data: {
            feed: data?.notifications ? [] : data?.feed || [],
            cursor: data?.notifications ? '' : data?.cursor || '',
        }
    })));

    constructor(isJunk: boolean = false) {
        if (isJunk) {
            $effect(() => {
                if (this.columns.length > 20) {
                    this.columns.shift();
                }
            })

            return;
        }

        const profileId = localStorage.getItem('currentProfile');

        accountsDb.profiles.get(Number(profileId))
          .then(res => {
              this.columns = res?.columns || [];
        });

        $effect(() => {
            const _id = localStorage.getItem('currentProfile');
            accountsDb.profiles.update(Number(_id), {
                columns: $state.snapshot(this.syncColumns),
            });
        });
    }

    add(column: Column) {
        this.columns.push(column)
    }

    remove(id: string) {
        this.columns = this.columns.filter(column => column.id !== id);
    }

    removeAll() {
        this.columns = [];
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
                const feed = column?.data?.feed;
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
                const feed = column?.data?.feed;
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
