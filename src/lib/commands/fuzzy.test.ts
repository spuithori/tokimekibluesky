import { describe, expect, it } from 'vitest';
import { fuzzyFilter, fuzzyScore } from './fuzzy';

describe('fuzzyScore', () => {
    it('部分列でないものは -Infinity', () => {
        expect(fuzzyScore('xyz', 'darkmode')).toBe(-Infinity);
    });

    it('連続一致と先頭一致を優遇する', () => {
        expect(fuzzyScore('dark', 'darkmode')).toBeGreaterThan(fuzzyScore('dark', 'd-a-r-k-x')!);
        expect(fuzzyScore('mode', 'mode')).toBeGreaterThan(fuzzyScore('mode', 'darkmode'));
    });

    it('大文字小文字を無視する', () => {
        expect(fuzzyScore('DARK', 'DarkMode')).toBeGreaterThan(-Infinity);
    });
});

describe('fuzzyFilter', () => {
    const items = ['ダークモードを切り替え', 'コマンドパレット', 'カラムを追加...', 'Launchpad'];

    it('空クエリは全件をそのまま返す', () => {
        expect(fuzzyFilter('', items, (s) => s)).toEqual(items);
    });

    it('マッチのみをスコア順で返す', () => {
        const result = fuzzyFilter('launch', items, (s) => s);
        expect(result).toEqual(['Launchpad']);
    });

    it('日本語の部分一致', () => {
        const result = fuzzyFilter('カラム', items, (s) => s);
        expect(result).toEqual(['カラムを追加...']);
    });
});

describe('fuzzyMatch', () => {
    it('fuzzyScore とスコアが完全一致する(パリティ)', async () => {
        const { fuzzyScore, fuzzyMatch } = await import('./fuzzy');
        const cases: [string, string][] = [
            ['', 'anything'],
            ['abc', 'abc'],
            ['abc', 'a big cat'],
            ['xyz', 'abc'],
            ['home', 'Home'],
            ['clk', 'Clock column'],
            ['toolong', 'abc'],
        ];
        for (const [q, t] of cases) {
            const match = fuzzyMatch(q, t);
            expect(match?.score ?? -Infinity, `${q} vs ${t}`).toBe(fuzzyScore(q, t));
        }
    });

    it('positions がマッチ位置を返し toSegments がハイライト区間を組む', async () => {
        const { fuzzyMatch, toSegments } = await import('./fuzzy');
        const match = fuzzyMatch('hme', 'home');
        expect(match?.positions).toEqual([0, 2, 3]);
        const segments = toSegments('home', match!.positions);
        expect(segments).toEqual([
            { text: 'h', hit: true },
            { text: 'o', hit: false },
            { text: 'me', hit: true },
        ]);
        expect(toSegments('abc', [])).toEqual([{ text: 'abc', hit: false }]);
    });
});
