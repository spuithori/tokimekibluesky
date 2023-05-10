import Dexie, { type Table } from 'dexie';
import { AppBskyFeedDefs } from '@atproto/api';

export interface Feed {
    id?: number;
    bookmark: string,
    owner: string,
    cid: string,
    indexedAt: string,
    createdAt: string,
    text: string,
    author: string,
    uri: string,
}

export interface Bookmark {
    id?: number,
    createdAt: string,
    name: string,
    text: string,
    owner: string,
}

export interface Draft {
    id?: number,
    createdAt: number,
    text: string,
    quotePost: AppBskyFeedDefs.PostView | undefined,
    replyRef: AppBskyFeedDefs.ReplyRef | undefined,
    images: [],
    owner: string,
}

export class BookmarkSubClassedDexie extends Dexie {
    feeds!: Table<Feed>;
    bookmarks!: Table<Bookmark>;
    drafts!: Table<Draft>;

    constructor() {
        super('bookmarkDatabase');
        this.version(2).stores({
            feeds: '++id, bookmark, owner, &cid, indexedAt, createdAt, text, author, uri',
            bookmarks: '++id, createdAt, name, text, owner',
            drafts: '++id, createdAt, text, quotePost, replyRef, images, owner',
        })
    }
}

export const db = new BookmarkSubClassedDexie();