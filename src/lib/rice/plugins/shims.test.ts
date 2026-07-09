// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { generateShimSource, RUNTIME_GLOBAL } from './shims';

describe('generateShimSource', () => {
    it('named export と default を実行時レジストリから引く shim を生成する', () => {
        const source = generateShimSource('svelte', ['mount', 'unmount', 'default'], true);
        expect(source).toContain(`globalThis["${RUNTIME_GLOBAL}"].get("svelte")`);
        expect(source).toContain('const _e0 = m["mount"];');
        expect(source).toContain('const _e1 = m["unmount"];');
        expect(source).toContain('export { _e0 as mount, _e1 as unmount };');
        expect(source).toContain('export default m.default;');
    });

    it('予約語の export 名(svelte/internal/client の await / if)を扱える', () => {
        const source = generateShimSource('svelte/internal/client', ['await', 'if', 'template'], false);
        expect(source).toContain('const _e0 = m["await"];');
        expect(source).toContain('export { _e0 as await, _e1 as if, _e2 as template };');
        expect(source).not.toContain('const { ');
        expect(() => new Function(source.replace(/export[^;]+;/g, ''))).not.toThrow();
    });

    it('識別子として不正なキーは除外する', () => {
        const source = generateShimSource('x', ['ok', 'not-valid', '123bad', '$fine', '_also'], false);
        expect(source).toContain('export { _e0 as ok, _e1 as $fine, _e2 as _also };');
        expect(source).not.toContain('not-valid');
        expect(source).not.toContain('123bad');
    });

    it('空モジュールは get 行のみになる', () => {
        const source = generateShimSource('svelte/internal/disclose-version', [], false);
        expect(source).not.toContain('export');
    });
});
