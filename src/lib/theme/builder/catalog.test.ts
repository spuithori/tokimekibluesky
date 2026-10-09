import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { TOKEN_CATALOG, catalogToken } from './catalog';
import { EXCLUDED, INTERNAL, ROLE_KINDS, UNDECLARED, definedTokens, referencedTokens, renderCatalog } from './catalog-source';

const root = process.cwd();

describe('トークンのカタログ', () => {
    it('生成済みのカタログは、今の CSS から作り直したものと一致する(CSS を変えたら node scripts/theme-catalog.mjs を実行する)', () => {
        expect(readFileSync('src/lib/theme/builder/catalog.generated.ts', 'utf8')).toBe(renderCatalog(root));
    });

    it('vars.css と theme.css で定義した、テーマの対象のトークンをすべて含む', () => {
        const names = new Set(TOKEN_CATALOG.map((t) => t.name));
        expect(definedTokens(root).filter((name) => !EXCLUDED.some((re) => re.test(name)) && !names.has(name))).toEqual([]);
    });

    it('CSS で定義していない役割・調整用のトークンは、コンポーネントが実際に参照しているものだけ', () => {
        const referenced = referencedTokens(root);
        expect([...Object.keys(ROLE_KINDS), ...UNDECLARED].filter((name) => !referenced.has(name))).toEqual([]);
    });

    it('フォント・文字の大きさ・カラム幅・実行時の値・内部の値は含めない', () => {
        const names = TOKEN_CATALOG.map((t) => t.name);
        for (const name of ['--font-body', '--ui-font', '--timeline-content-font-size', '--deck-m-width', '--safe-area-bottom', ...INTERNAL]) {
            expect(names).not.toContain(name);
        }
    });

    it('役割トークン28個をすべて含み、名前は重複しない', () => {
        expect(TOKEN_CATALOG.filter((t) => t.group === 'role')).toHaveLength(28);
        expect(new Set(TOKEN_CATALOG.map((t) => t.name)).size).toBe(TOKEN_CATALOG.length);
    });

    it('カタログに無い名前は「その他」の自由入力として扱う', () => {
        expect(catalogToken('--theme-color-darkness-50')).toEqual({ name: '--theme-color-darkness-50', group: 'other', kind: 'other' });
    });
});
