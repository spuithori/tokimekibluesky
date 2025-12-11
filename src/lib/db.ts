import Dexie, { type Table } from 'dexie';
import type {AppBskyFeedDefs, AtpSessionData} from '@atproto/api';
import type {Theme} from "$lib/types/theme";

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
    json?: object,
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
            drafts: 'id, createdAt, text, quotePost, replyRef, images, owner',
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
    appViewProxy?: string,
}

type notificationCategories = 'reply' | 'like' | 'repost' | 'follow' | 'quote'  | 'mention';

export interface Account {
    id?: number,
    service: string,
    session?: AtpSessionData | null,
    did: string,
    avatar?: string,
    name?: string,
    handle?: string,
    following?: {
        indexedAt: string,
        data: string[],
    },
    notification?: notificationCategories[],
    feeds?: any[],
    lists?: any[],
    cloudBookmarks?: any[],
    isOAuth?: boolean,
    oauthDid?: string,
}

export class AccountSubClassDexie extends Dexie {
    profiles: Table<Profile>;
    accounts: Table<Account>;

    constructor() {
        super('accountDatabase');

        this.version(1).stores({
            profiles: '++id, name, createdAt, *accounts, primary, *columns',
            accounts: '++id, service, session, &did, avatar, name, following, notification, *feeds, *lists',
        });

        this.version(2).stores({
            profiles: '++id, name, createdAt, *accounts, primary, *columns',
            accounts: '++id, service, session, &did, avatar, name, following, notification, *feeds, *lists, *cloudBookmarks',
        });

        this.version(3).stores({
            profiles: '++id, name, createdAt, *accounts, primary, *columns, appViewProxy',
            accounts: '++id, service, session, &did, avatar, name, following, notification, *feeds, *lists, *cloudBookmarks',
        });

        this.version(4).stores({
            profiles: '++id, name, createdAt, *accounts, primary, *columns, appViewProxy',
            accounts: '++id, service, session, &did, avatar, name, following, notification, *feeds, *lists, *cloudBookmarks, isOAuth, oauthDid',
        });
    }
}

export const accountsDb = new AccountSubClassDexie();

export class ThemeSubClassDexie extends Dexie {
    themes: Table<Theme>;

    constructor() {
        super('themeDatabase');

        this.version(2).stores({
            themes: '&id, createdAt, updatedAt, name, description, style, options, author, keyword, version, code'
        });
    }
}

export const themesDb = new ThemeSubClassDexie();