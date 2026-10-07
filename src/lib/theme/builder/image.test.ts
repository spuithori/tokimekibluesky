import { describe, expect, it } from 'vitest';
import { isAutoIcon, markAutoIcon } from './image';

const PNG_1x1 = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0));

describe('自動アイコンの目印', () => {
    it('ビルダーが作った PNG だけを自動アイコンと判定する', () => {
        expect(isAutoIcon(PNG_1x1)).toBe(false);
        expect(isAutoIcon(markAutoIcon(PNG_1x1))).toBe(true);
        expect(isAutoIcon(new TextEncoder().encode('RIFF....WEBPVP8 '))).toBe(false);
    });

    it('目印は IHDR の直後に入り、画像の中身と CRC は壊さない', () => {
        const marked = markAutoIcon(PNG_1x1);
        expect(marked.subarray(0, 33)).toEqual(PNG_1x1.subarray(0, 33));
        expect(marked.subarray(marked.length - (PNG_1x1.length - 33))).toEqual(PNG_1x1.subarray(33));
        const length = new DataView(marked.buffer).getUint32(33);
        const chunk = marked.subarray(37, 37 + 4 + length);
        let crc = 0xffffffff;
        for (const byte of chunk) {
            crc ^= byte;
            for (let k = 0; k < 8; k++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
        }
        expect(new DataView(marked.buffer).getUint32(37 + 4 + length)).toBe((crc ^ 0xffffffff) >>> 0);
    });
});
