// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { init, parse } from 'es-module-lexer';
import { version as svelteVersion } from 'svelte/package.json';
import { sha256Integrity } from './integrity';
import { validatePluginManifest } from './types';

const fixtureDir = join(__dirname, '..', '..', '..', '..', 'static', 'test-plugins', 'fixture');
const mainJs = readFileSync(join(fixtureDir, 'main.js'), 'utf8');
const manifestJson = JSON.parse(readFileSync(join(fixtureDir, 'manifest.json'), 'utf8'));

describe('fixture plugin 鮮度ガード (scripts/build-plugin-fixture.mjs の再生成漏れ検出)', () => {
    it('manifest が妥当で integrity が main.js の実ハッシュと一致する', async () => {
        const validated = validatePluginManifest(manifestJson);
        expect('ok' in validated).toBe(true);
        expect(manifestJson.integrity).toBe(await sha256Integrity(mainJs));
    });

    it('svelteVersion がインストール済み svelte と一致する', () => {
        expect(manifestJson.svelteVersion).toBe(svelteVersion);
    });

    it('main.js の import はホスト提供 specifier のみ', async () => {
        await init;
        const [imports] = parse(mainJs);
        for (const imp of imports) {
            if (imp.d === -2) continue;
            const specifier = imp.n;
            expect(specifier, 'dynamic import(式) は使用不可').toBeDefined();
            expect(
                specifier === 'svelte' || specifier!.startsWith('svelte/') || specifier === '@tokimeki/plugin-api',
                `unsupported import: ${specifier}`,
            ).toBe(true);
        }
    });
});
