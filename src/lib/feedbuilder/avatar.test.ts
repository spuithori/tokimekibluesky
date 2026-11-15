import { describe, expect, it } from 'vitest';
import { avatarUrl, blobCid, generatorAvatar, toBlobJson } from './avatar';

const CID = 'bafkreiabc';
const json = { $type: 'blob', ref: { $link: CID }, mimeType: 'image/png', size: 1234 };

const lex = { $type: 'blob', ref: { toString: () => CID }, mimeType: 'image/jpeg', size: 99 };

describe('画像の参照', () => {
  it('どの形でも CID を取り出し、レコードに書く形にそろえる', () => {
    expect(blobCid(json)).toBe(CID);
    expect(blobCid(lex)).toBe(CID);
    expect(blobCid({ cid: CID, mimeType: 'image/png' })).toBe(CID);
    expect(blobCid(null)).toBeNull();
    expect(blobCid({ ref: {} })).toBeNull();
    expect(toBlobJson(lex)).toEqual({ $type: 'blob', ref: { $link: CID }, mimeType: 'image/jpeg', size: 99 });
    expect(toBlobJson('x')).toBeNull();
  });

  it('表示用の URL', () => {
    expect(avatarUrl('did:plc:a', json)).toBe(`https://cdn.bsky.app/img/avatar/plain/did:plc:a/${CID}@jpeg`);
    expect(avatarUrl(null, json)).toBeNull();
    expect(avatarUrl('did:plc:a', undefined)).toBeNull();
  });
});

describe('掲載に付ける画像', () => {
  const mine = { $type: 'blob', ref: { $link: 'mine' }, mimeType: 'image/jpeg', size: 1 };
  const theirs = { $type: 'blob', ref: { $link: 'theirs' }, mimeType: 'image/png', size: 2 };
  const dflt = { $type: 'blob', ref: { $link: 'default' }, mimeType: 'image/png', size: 3 };
  const pick = async (o: Parameters<typeof generatorAvatar>[0], fail = false) => {
    let uploaded = 0;
    const got = await generatorAvatar(o, async () => {
      uploaded++;
      if (fail) throw new Error('upload failed');
      return dflt;
    });
    return { cid: got?.ref.$link ?? null, uploaded };
  };

  it('定義の画像があれば、それを使う', async () => {
    expect(await pick({ definition: mine, existing: theirs })).toEqual({ cid: 'mine', uploaded: 0 });
  });

  it('一覧から掲載し直すときは、掲載に付いている画像を残す', async () => {
    expect(await pick({ existing: theirs })).toEqual({ cid: 'theirs', uploaded: 0 });
  });

  it('ビルダーで画像を外して保存したら、掲載に付いていたものではなく既定のアイコン', async () => {
    expect(await pick({ existing: theirs, fromBuilder: true })).toEqual({ cid: 'default', uploaded: 1 });
  });

  it('どこにもなければ既定のアイコン。登録に失敗しても掲載は止めない', async () => {
    expect(await pick({})).toEqual({ cid: 'default', uploaded: 1 });
    expect(await pick({}, true)).toEqual({ cid: null, uploaded: 1 });
  });
});
