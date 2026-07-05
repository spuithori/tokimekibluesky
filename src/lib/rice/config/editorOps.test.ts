import { describe, expect, it } from 'vitest';
import {
    autoClosePair,
    enterAutoIndent,
    indentTab,
    smartBackspace,
    toggleComment,
    typeThroughBrace,
    type EditOp,
} from './editorOps';

function apply(text: string, op: EditOp): { text: string; selStart: number; selEnd: number } {
    return {
        text: text.slice(0, op.replaceStart) + op.insert + text.slice(op.replaceEnd),
        selStart: op.selStart,
        selEnd: op.selEnd,
    };
}

describe('editorOps', () => {
    it('indentTab: 単一キャレットは4スペース挿入', () => {
        const op = indentTab('a', 1, 1, false)!;
        expect(apply('a', op)).toEqual({ text: 'a    ', selStart: 5, selEnd: 5 });
    });

    it('indentTab: 複数行インデントとアウトデント(選択補正込み)', () => {
        const text = 'a = 1\nb = 2';
        const indented = apply(text, indentTab(text, 0, 11, false)!);
        expect(indented.text).toBe('    a = 1\n    b = 2');
        expect(indented).toMatchObject({ selStart: 4, selEnd: 19 });

        const back = apply(indented.text, indentTab(indented.text, 4, 19, true)!);
        expect(back.text).toBe(text);
    });

    it('enterAutoIndent: 前行インデント継承+行末{で+4', () => {
        const text = '    key = 1';
        expect(apply(text, enterAutoIndent(text, 11, 11)!).text).toBe('    key = 1\n    ');

        const brace = 'focus {';
        const r = apply(brace, enterAutoIndent(brace, 7, 7)!);
        expect(r.text).toBe('focus {\n    ');
        expect(r.selStart).toBe(12);
    });

    it('enterAutoIndent: {|}間でブロック展開しキャレットを中央行へ', () => {
        const text = 'focus {}';
        const r = apply(text, enterAutoIndent(text, 7, 7)!);
        expect(r.text).toBe('focus {\n    \n}');
        expect(r.selStart).toBe(12);
        expect(r.selEnd).toBe(12);
    });

    it('autoClosePair: {はペア挿入・キャレット中央', () => {
        const r = apply('x = ', autoClosePair('x = ', 4, 4, '{')!);
        expect(r.text).toBe('x = {}');
        expect(r.selStart).toBe(5);
    });

    it('autoClosePair: "は文脈依存(EOL/空白/}/,のみペア・次が"ならtype-through・単語前はnull)', () => {
        expect(apply('a = ', autoClosePair('a = ', 4, 4, '"')!).text).toBe('a = ""');

        const through = autoClosePair('a = ""', 5, 5, '"')!;
        expect(apply('a = ""', through)).toEqual({ text: 'a = ""', selStart: 6, selEnd: 6 });

        expect(autoClosePair('a = word', 4, 4, '"')).toBeNull();
        expect(autoClosePair('a = x', 0, 2, '"')).toBeNull();
    });

    it('typeThroughBrace: 次が}なら前進のみ', () => {
        const text = 'focus {}';
        const op = typeThroughBrace(text, 7, 7)!;
        expect(apply(text, op)).toEqual({ text, selStart: 8, selEnd: 8 });
    });

    it('typeThroughBrace: 空白行での}は開き行インデントへ自動アウトデント(ネスト対応)', () => {
        const text = 'a {\n    b {\n        x = 1\n    }\n        ';
        const op = typeThroughBrace(text, text.length, text.length)!;
        const r = apply(text, op);
        expect(r.text).toBe('a {\n    b {\n        x = 1\n    }\n}');
        expect(r.selStart).toBe(r.text.length);

        expect(typeThroughBrace('key = 1', 7, 7)).toBeNull();
    });

    it('typeThroughBrace: 既に正しいインデントならnull(ネイティブ挿入)', () => {
        const text = 'a {\n';
        expect(typeThroughBrace(text, 4, 4)).toBeNull();
    });

    it('smartBackspace: ペア{}・""を両側削除', () => {
        const brace = apply('x = {}', smartBackspace('x = {}', 5, 5)!);
        expect(brace.text).toBe('x = ');
        const quote = apply('x = ""', smartBackspace('x = ""', 5, 5)!);
        expect(quote.text).toBe('x = ');
    });

    it('smartBackspace: インデントはタブストップまで一括削除・それ以外はnull', () => {
        const r = apply('        x', smartBackspace('        x', 8, 8)!);
        expect(r.text).toBe('    x');
        expect(r.selStart).toBe(4);

        expect(smartBackspace('     x', 5, 5)).toBeNull();
        expect(smartBackspace('abc', 3, 3)).toBeNull();
        expect(smartBackspace(' x', 1, 1)).toBeNull();
    });

    it('toggleComment: コメント付与→解除の往復・選択補正', () => {
        const text = 'a = 1\n\nb = 2';
        const commented = apply(text, toggleComment(text, 0, 12)!);
        expect(commented.text).toBe('# a = 1\n\n# b = 2');

        const back = apply(commented.text, toggleComment(commented.text, 0, commented.text.length)!);
        expect(back.text).toBe(text);
    });

    it('toggleComment: 混在(一部コメント)は全行コメント化・選択なしは現在行', () => {
        const mixed = '# a = 1\nb = 2';
        expect(apply(mixed, toggleComment(mixed, 0, 13)!).text).toBe('# # a = 1\n# b = 2');

        const single = 'a = 1\nb = 2';
        expect(apply(single, toggleComment(single, 8, 8)!).text).toBe('a = 1\n# b = 2');
    });
});
