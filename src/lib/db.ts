import Dexie, { type Table } from 'dexie';

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

export class BookmarkSubClassedDexie extends Dexie {
    feeds!: Table<Feed>;
    bookmarks!: Table<Bookmark>;

    constructor() {
        super('bookmarkDatabase');
        this.version(1).stores({
            feeds: '++id, bookmark, owner, &cid, indexedAt, createdAt, text, author, uri',
            bookmarks: '++id, createdAt, name, text, owner',
        })
    }
}

export const db = new BookmarkSubClassedDexie();