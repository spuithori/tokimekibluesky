import { describe, it, expect } from 'vitest';
import { cidToIntegrity, parsePluginAtUri } from './atproto';
import { RicePluginError } from './types';

const REAL_BLOB_CID = 'bafkreihwihm6kpd6zuwhhlro75p5qks5qtrcu55jp3gddbfjsieiv7wuka';
const REAL_BLOB_SRI = 'sha256-9kHZ5Tx+zSxzri7/X9gqXYTiKnepfswxhKmSCIr+1FA=';

const DAG_PB_CID = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';

describe('cidToIntegrity', () => {
    it('実在の blob の CID から SRI を復元する', () => {
        expect(cidToIntegrity(REAL_BLOB_CID)).toBe(REAL_BLOB_SRI);
    });

    it('raw codec でない CID を拒否する', () => {
        expect(() => cidToIntegrity(DAG_PB_CID)).toThrow(RicePluginError);
        expect(() => cidToIntegrity(DAG_PB_CID)).toThrow(/raw codec/);
    });

    it('CID として解釈できない文字列を拒否する', () => {
        expect(() => cidToIntegrity('not-a-cid')).toThrow(/CID を解釈できません/);
    });
});

describe('parsePluginAtUri', () => {
    const uri = 'at://did:plc:abc123/tech.tokimeki.plugin.declaration/aurora';

    it('did / collection / rkey に分解する', () => {
        expect(parsePluginAtUri(uri)).toEqual({
            did: 'did:plc:abc123',
            collection: 'tech.tokimeki.plugin.declaration',
            rkey: 'aurora',
        });
    });

    it('at:// で始まらないものを拒否する', () => {
        expect(() => parsePluginAtUri('https://example.com/x')).toThrow(/at-uri ではありません/);
    });

    it('authority が handle の at-uri を拒否する(DID のみ許容)', () => {
        expect(() => parsePluginAtUri('at://alice.bsky.social/tech.tokimeki.plugin.declaration/aurora')).toThrow(/DID である必要があります/);
    });

    it('collection が違う at-uri を拒否する', () => {
        expect(() => parsePluginAtUri('at://did:plc:abc123/app.bsky.feed.post/aurora')).toThrow(/collection が/);
    });

    it('rkey がプラグイン id の規則に反するものを拒否する', () => {
        expect(() => parsePluginAtUri('at://did:plc:abc123/tech.tokimeki.plugin.declaration/Aurora')).toThrow(/rkey/);
        expect(() => parsePluginAtUri('at://did:plc:abc123/tech.tokimeki.plugin.declaration/3jk2l')).toThrow(/rkey/);
    });

    it('余分なセグメントを拒否する', () => {
        expect(() => parsePluginAtUri('at://did:plc:abc123/tech.tokimeki.plugin.declaration/aurora/extra')).toThrow(/形式が不正/);
    });
});
