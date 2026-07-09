// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { rewriteImports } from './rewrite';
import { RicePluginError } from './types';

const resolve = (specifier: string) => {
    if (specifier === 'svelte' || specifier.startsWith('svelte/') || specifier === '@tokimeki/plugin-api') {
        return `blob:shim/${specifier}`;
    }
    return undefined;
};

describe('rewriteImports', () => {
    it('静的 import の bare specifier を shim URL に書き換える', async () => {
        const code = `import 'svelte/internal/disclose-version';\nimport * as $ from 'svelte/internal/client';\nimport { mount } from "svelte";\nexport default {};`;
        const out = await rewriteImports(code, resolve);
        expect(out).toContain(`import 'blob:shim/svelte/internal/disclose-version'`);
        expect(out).toContain(`import * as $ from 'blob:shim/svelte/internal/client'`);
        expect(out).toContain(`import { mount } from "blob:shim/svelte"`);
        expect(out).not.toContain(`from 'svelte`);
    });

    it('export-from と静的 dynamic import も書き換える', async () => {
        const code = `export { tick } from 'svelte';\nconst p = import('svelte/store');`;
        const out = await rewriteImports(code, resolve);
        expect(out).toContain(`export { tick } from 'blob:shim/svelte'`);
        expect(out).toContain(`import("blob:shim/svelte/store")`);
    });

    it('@tokimeki/plugin-api を解決する', async () => {
        const out = await rewriteImports(`import { PLUGIN_API_VERSION } from '@tokimeki/plugin-api';`, resolve);
        expect(out).toContain('blob:shim/@tokimeki/plugin-api');
    });

    it('未知の bare specifier は unsupported-import', async () => {
        await expect(rewriteImports(`import three from 'three';`, resolve)).rejects.toMatchObject({ code: 'unsupported-import' });
    });

    it('動的な import(式) は unsupported-import', async () => {
        await expect(rewriteImports(`const m = import('mod' + 'ule');`, resolve)).rejects.toBeInstanceOf(RicePluginError);
    });

    it('相対・URL specifier は素通しする', async () => {
        const code = `import x from './local.js';\nimport y from 'https://example.com/m.js';`;
        expect(await rewriteImports(code, resolve)).toBe(code);
    });

    it('import を含まないコードは無変更', async () => {
        const code = 'export default { effectLayers: {} };';
        expect(await rewriteImports(code, resolve)).toBe(code);
    });
});
