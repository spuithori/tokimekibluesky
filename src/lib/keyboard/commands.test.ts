import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CATEGORY_LABELS, commands, effectiveKeys, findConflict, resolveBindings } from './commands';
import { normalizeComboString } from './keys';

const en = JSON.parse(readFileSync(resolve(__dirname, '../i18n/locales/en.json'), 'utf8')) as Record<string, string>;
const ja = JSON.parse(readFileSync(resolve(__dirname, '../i18n/locales/ja.json'), 'utf8')) as Record<string, string>;

describe('command registry integrity', () => {
    it('has unique ids', () => {
        const ids = commands.map((command) => command.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('stores every default key in canonical form', () => {
        for (const command of commands) {
            for (const key of command.keys) {
                expect(normalizeComboString(key), `${command.id}: ${key}`).toBe(key);
            }
        }
    });

    it('never binds one key to two commands outside an explicit group', () => {
        const table = resolveBindings(commands, {});
        for (const [combo, bucket] of table) {
            if (bucket.length < 2) {
                continue;
            }
            const groups = new Set(bucket.map((command) => command.group ?? `solo:${command.id}`));
            expect(groups.size, `combo ${combo} shared by ${bucket.map((c) => c.id).join(', ')}`).toBe(1);
        }
    });

    it('has translated labels in en and ja for every command and category', () => {
        const labels = [...commands.map((command) => command.label), ...Object.values(CATEGORY_LABELS)];
        const missing = labels.filter((label) => !(label in en) || !(label in ja));
        expect(missing).toEqual([]);
    });
});

describe('binding overrides', () => {
    const like = commands.find((command) => command.id === 'post.like')!;
    const repost = commands.find((command) => command.id === 'post.repost')!;

    it('replaces default keys only for overridden commands', () => {
        const overrides = { 'post.like': ['f'] };
        expect(effectiveKeys(like, overrides)).toEqual(['f']);
        expect(effectiveKeys(repost, overrides)).toEqual(['r']);
        const table = resolveBindings(commands, overrides);
        expect(table.get('f')?.map((command) => command.id)).toEqual(['post.like']);
        expect(table.has('l')).toBe(false);
    });

    it('allows an empty override to disable a command', () => {
        const table = resolveBindings(commands, { 'post.like': [] });
        expect(table.has('l')).toBe(false);
    });

    it('reports conflicts against other commands but not within the same group', () => {
        expect(findConflict(commands, {}, 'r', like)?.id).toBe('post.repost');
        expect(findConflict(commands, {}, 'x', like)).toBeNull();
        const pageClose = commands.find((command) => command.id === 'page.close')!;
        expect(findConflict(commands, {}, 'Escape', pageClose)).toBeNull();
        expect(findConflict(commands, {}, 'Escape', like)?.group).toBe('escape');
    });
});
