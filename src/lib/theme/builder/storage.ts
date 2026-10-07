import Dexie, { type Table } from 'dexie';
import type { Draft } from './draft';

class BuilderDatabase extends Dexie {
    drafts!: Table<Draft, string>;

    constructor() {
        super('themeBuilder');
        this.version(1).stores({ drafts: '&id, updatedAt' });
    }
}

let db: BuilderDatabase | null = null;

function open(): BuilderDatabase {
    db ??= new BuilderDatabase();
    return db;
}

export function cloneDraft(draft: Draft): Draft {
    return {
        ...draft,
        tokens: draft.tokens.map((t) => ({ name: t.name, value: t.value })),
        dark: draft.dark.map((t) => ({ name: t.name, value: t.value })),
        variants: draft.variants.map((v) => ({ ...v, tokens: v.tokens.map((t) => ({ name: t.name, value: t.value })) })),
        seeds: { ...draft.seeds },
        overrides: { ...draft.overrides },
        darkOverrides: { ...draft.darkOverrides },
        images: draft.images.map((image) => ({ key: image.key, blob: image.blob })),
    };
}

export async function saveDraft(draft: Draft): Promise<void> {
    await open().drafts.put(cloneDraft({ ...draft, updatedAt: new Date().toISOString() }));
}

export async function loadDraft(id: string): Promise<Draft | undefined> {
    return open().drafts.get(id);
}

export async function listDrafts(): Promise<Draft[]> {
    return open().drafts.orderBy('updatedAt').reverse().toArray();
}

export async function deleteDraft(id: string): Promise<void> {
    await open().drafts.delete(id);
}

export function closeBuilderDatabase(): void {
    db?.close();
    db = null;
}
