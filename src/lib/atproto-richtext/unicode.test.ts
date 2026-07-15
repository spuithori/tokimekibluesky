import { describe, it, expect } from 'vitest';
import { UnicodeString } from './unicode';

const enc = new TextEncoder();

describe('UnicodeString', () => {
    describe('utf16 / toString', () => {
        it('keeps the original utf16 string', () => {
            expect(new UnicodeString('hello').utf16).toBe('hello');
        });

        it('toString returns the utf16 string', () => {
            expect(new UnicodeString('あいう').toString()).toBe('あいう');
        });
    });

    describe('utf8', () => {
        it('encodes ASCII to matching bytes', () => {
            const u = new UnicodeString('abc');
            expect(Array.from(u.utf8)).toEqual(Array.from(enc.encode('abc')));
        });

        it('encodes multibyte Japanese to matching bytes', () => {
            const u = new UnicodeString('あ');
            expect(Array.from(u.utf8)).toEqual(Array.from(enc.encode('あ')));
        });

        it('encodes a surrogate-pair emoji to matching bytes', () => {
            const u = new UnicodeString('👍');
            expect(Array.from(u.utf8)).toEqual(Array.from(enc.encode('👍')));
        });

        it('produces an empty byte array for an empty string', () => {
            expect(new UnicodeString('').utf8.byteLength).toBe(0);
        });
    });

    describe('length (utf8 byte length)', () => {
        it('counts one byte per ASCII char', () => {
            expect(new UnicodeString('abc').length).toBe(3);
        });

        it('counts three bytes for a Japanese char', () => {
            expect(new UnicodeString('あ').length).toBe(3);
        });

        it('counts four bytes for an emoji', () => {
            expect(new UnicodeString('👍').length).toBe(4);
        });

        it('is zero for an empty string', () => {
            expect(new UnicodeString('').length).toBe(0);
        });

        it('sums bytes across mixed scripts', () => {
            const text = 'a あ 👍 z';
            expect(new UnicodeString(text).length).toBe(enc.encode(text).byteLength);
        });
    });

    describe('slice (UTF-8 byte offsets)', () => {
        it('slices ASCII by byte offset', () => {
            expect(new UnicodeString('hello').slice(1, 3)).toBe('el');
        });

        it('slices on multibyte boundaries', () => {
            const u = new UnicodeString('あい'); // 3 bytes each
            expect(u.slice(0, 3)).toBe('あ');
            expect(u.slice(3, 6)).toBe('い');
        });

        it('slices to the end when end is omitted', () => {
            expect(new UnicodeString('hello').slice(2)).toBe('llo');
        });
    });

    describe('graphemeLength', () => {
        it('counts ASCII characters', () => {
            expect(new UnicodeString('abc').graphemeLength).toBe(3);
        });

        it('counts Japanese characters', () => {
            expect(new UnicodeString('あいう').graphemeLength).toBe(3);
        });

        it('counts a ZWJ family emoji as a single grapheme', () => {
            expect(new UnicodeString('👨‍👩‍👧‍👦').graphemeLength).toBe(1);
        });

        it('counts a base + combining mark as a single grapheme', () => {
            expect(new UnicodeString('á').graphemeLength).toBe(1); // á (NFD)
        });

        it('is zero for an empty string', () => {
            expect(new UnicodeString('').graphemeLength).toBe(0);
        });
    });

    describe('utf16IndexToUtf8Index', () => {
        it('maps utf16 index to utf8 byte offset for multibyte text', () => {
            const u = new UnicodeString('あい');
            expect(u.utf16IndexToUtf8Index(1)).toBe(3);
            expect(u.utf16IndexToUtf8Index(2)).toBe(6);
        });
    });

    describe('lazy utf8 initialization', () => {
        it('does not encode utf8 in the constructor', () => {
            const u = new UnicodeString('hello world');
            expect((u as any)._utf8).toBeUndefined();
        });

        it('does not encode utf8 when only graphemeLength is read', () => {
            const u = new UnicodeString('hello world');
            void u.graphemeLength;
            expect((u as any)._utf8).toBeUndefined();
        });

        it('encodes utf8 on first access to .utf8', () => {
            const u = new UnicodeString('hello');
            expect((u as any)._utf8).toBeUndefined();
            void u.utf8;
            expect((u as any)._utf8).toBeDefined();
        });

        it('encodes utf8 on first access to .length', () => {
            const u = new UnicodeString('hello');
            expect((u as any)._utf8).toBeUndefined();
            void u.length;
            expect((u as any)._utf8).toBeDefined();
        });

        it('memoizes utf8 as the same Uint8Array reference', () => {
            const u = new UnicodeString('hello');
            expect(u.utf8).toBe(u.utf8);
        });
    });
});
