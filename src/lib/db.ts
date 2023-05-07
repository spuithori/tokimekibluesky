import Dexie, { type Table } from 'dexie';
import dexieCloud from "dexie-cloud-addon";

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

export class BookmarkSubClassedDexie extends Dexie {
    feeds!: Table<Feed>;
    bookmarks!: Table<Bookmark>;

    constructor() {
        super('bookmarkDatabase', {addons: [dexieCloud]});
        this.version(1).stores({
            feeds: '@id, bookmark, owner, &cid, indexedAt, createdAt, text, author, uri',
            bookmarks: '@id, createdAt, name, text, owner',
        })
    }
}

export const db = new BookmarkSubClassedDexie();

db.cloud.configure({
    databaseUrl: "https://zua0l83pl.dexie.cloud",
    requireAuth: true
});