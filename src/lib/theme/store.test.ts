import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { subjectRkey } from './store';

function appviewSubjectRkey(subjectUri: string): string {
    const BASE32 = 'abcdefghijklmnopqrstuvwxyz234567';
    let bits = 0;
    let value = 0;
    let out = '';
    for (const byte of createHash('sha256').update(subjectUri).digest()) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            out += BASE32[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
    return out.slice(0, 32);
}

describe('subjectRkey', () => {
    it.each([
        'at://did:plc:4tr5dqti7nmu6g2czpthntak/tech.tokimeki.theme.theme/nova',
        'at://did:web:example.com/tech.tokimeki.theme.theme/日本語',
    ])('AppView と同じ rkey を作り、レコードキーとして使える文字だけで構成される: %s', async (uri) => {
        const rkey = await subjectRkey(uri);
        expect(rkey).toBe(appviewSubjectRkey(uri));
        expect(rkey).toMatch(/^[a-z2-7]{32}$/);
    });
});
