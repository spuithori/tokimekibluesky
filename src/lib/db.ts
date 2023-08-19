import Dexie, { type Table } from 'dexie';
import {AppBskyFeedDefs, AtpSessionData} from '@atproto/api';

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

        this.version(1).stores({
            feeds: '++id, bookmark, owner, &cid, indexedAt, createdAt, text, author, uri',
            bookmarks: '++id, createdAt, name, text, owner',
        });

        this.version(2).stores({
            feeds: '++id, bookmark, owner, &cid, indexedAt, createdAt, text, author, uri',
            bookmarks: '++id, createdAt, name, text, owner',
            drafts: '++id, createdAt, text, quotePost, replyRef, images, owner',
        });
    }
}

export const db = new BookmarkSubClassedDexie();

export interface Profile {
    id?: number,
    name: string,
    createdAt: string,
    accounts: number[],
    primary: number | null,
    columns: any[],
}

export interface Account {
    id?: number,
    service: string,
    session: AtpSessionData,
    did: string,
    avatar?: string,
    name?: string,
    following?: {
        indexedAt: string,
        data: string[],
    }
}

export class AccountSubClassDexie extends Dexie {
    profiles: Table<Profile>;
    accounts: Table<Account>;

    constructor() {
        super('accountDatabase');

        this.version(1).stores({
            profiles: '++id, name, createdAt, *accounts, primary, *columns',
            accounts: '++id, service, session, &did, avatar, name, following',
        });
    }
}

export const accountsDb = new AccountSubClassDexie();