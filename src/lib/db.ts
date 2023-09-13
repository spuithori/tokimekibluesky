import Dexie, { type Table } from 'dexie';
import dexieCloud from "dexie-cloud-addon";
import {AppBskyFeedDefs, AtpSessionData} from '@atproto/api';
import type {Theme} from "$lib/types/theme";

export interface Feed {
    id?: string;
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
    id?: string,
    createdAt: string,
    name: string,
    text: string,
    owner: string,
}

export interface Draft {
    id?: string,
    createdAt: number,
    text: string,
    quotePost: AppBskyFeedDefs.PostView | undefined,
    replyRef: AppBskyFeedDefs.ReplyRef | undefined,
    images: [],
    owner: string,
}

export interface Profile {
    id?: string,
    name: string,
    createdAt: string,
    accounts: string[],
    primary: string | null,
    columns: any[],
}

type notificationCategories = 'reply' | 'like' | 'repost' | 'follow' | 'quote'  | 'mention';

export interface Account {
    id?: string,
    service: string,
    session?: AtpSessionData,
    did: string,
    avatar?: string,
    name?: string,
    following?: {
        indexedAt: string,
        data: string[],
    },
    notification?: notificationCategories[],
}

export class SyncSubClassedDexie extends Dexie {
    feeds!: Table<Feed>;
    bookmarks!: Table<Bookmark>;
    drafts!: Table<Draft>;
    profiles: Table<Profile>;
    accounts: Table<Account>;

    constructor() {
        super('syncDatabase', {addons: [dexieCloud]});

        this.version(1).stores({
            feeds: '@id, bookmark, owner, &cid, indexedAt, createdAt, text, author, uri',
            bookmarks: '@id, createdAt, name, text, owner',
            drafts: '@id, createdAt, text, quotePost, replyRef, images, owner',
            profiles: '@id, name, createdAt, *accounts, primary, *columns',
            accounts: '@id, service, session, &did, avatar, name, following, notification',
        });
    }
}

export const db = new SyncSubClassedDexie();

db.cloud.configure({
    databaseUrl: "https://zua0l83pl.dexie.cloud",
    unsyncedTables: ['accounts'],
    requireAuth: false
});

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

export class AccountSubClassDexie extends Dexie {
    profiles: Table<Profile>;
    accounts: Table<Account>;

    constructor() {
        super('accountDatabase');

        this.version(1).stores({
            profiles: '++id, name, createdAt, *accounts, primary, *columns',
            accounts: '++id, service, session, &did, avatar, name, following, notification',
        });

        this.version(2).stores({
            profiles: '@id, name, createdAt, *accounts, primary, *columns',
            accounts: '@id, service, session, &did, avatar, name, following, notification',
        });
    }
}

export const accountsDb = new AccountSubClassDexie();

/* export class BookmarkSubClassedDexie extends Dexie {
    feeds!: Table<Feed>;
    bookmarks!: Table<Bookmark>;
    drafts!: Table<Draft>;

    constructor() {
        super('bookmarkDatabase', {addons: [dexieCloud]});

        this.version(1).stores({
            feeds: '++id, bookmark, owner, &cid, indexedAt, createdAt, text, author, uri',
            bookmarks: '++id, createdAt, name, text, owner',
        });

        this.version(2).stores({
            feeds: '@id, bookmark, owner, &cid, indexedAt, createdAt, text, author, uri',
            bookmarks: '@id, createdAt, name, text, owner',
            drafts: '@id, createdAt, text, quotePost, replyRef, images, owner',
        });

        this.version(3).stores({
            feeds: '@id, bookmark, owner, &cid, indexedAt, createdAt, text, author, uri',
            bookmarks: '@id, createdAt, name, text, owner',
            drafts: '@id, createdAt, text, quotePost, replyRef, images, owner',
        });
    }
}

export const db = new BookmarkSubClassedDexie(); */



/* export class AccountSubClassDexie extends Dexie {
    profiles: Table<Profile>;
    accounts: Table<Account>;

    constructor() {
        super('accountDatabase', {addons: [dexieCloud]});

        this.version(1).stores({
            profiles: '++id, name, createdAt, *accounts, primary, *columns',
            accounts: '++id, service, session, &did, avatar, name, following, notification',
        });

        this.version(2).stores({
            profiles: '@id, name, createdAt, *accounts, primary, *columns',
            accounts: '@id, service, session, &did, avatar, name, following, notification',
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

db.cloud.configure({
    databaseUrl: "https://zua0l83pl.dexie.cloud",
    requireAuth: false
});

accountsDb.cloud.configure({
    databaseUrl: "https://zua0l83pl.dexie.cloud",
    unsyncedTables: ['accounts'],
    requireAuth: false
}); */