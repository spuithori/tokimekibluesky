import { t } from 'tokimeki-i18n';

export interface BlobJson {
  $type: 'blob';
  ref: { $link: string };
  mimeType: string;
  size: number;
}

export function blobCid(ref: unknown): string | null {
  if (!ref || typeof ref !== 'object') return null;
  const r = (ref as { ref?: unknown }).ref;
  if (r && typeof r === 'object' && typeof (r as { $link?: unknown }).$link === 'string') return (r as { $link: string }).$link;
  if (r && typeof (r as { toString?: unknown }).toString === 'function') {
    const s = String(r);
    if (s && s !== '[object Object]') return s;
  }

  const cid = (ref as { cid?: unknown }).cid;
  return typeof cid === 'string' ? cid : null;
}

export function toBlobJson(ref: unknown): BlobJson | null {
  const cid = blobCid(ref);
  if (!cid) return null;
  const o = ref as { mimeType?: unknown; size?: unknown };
  return {
    $type: 'blob',
    ref: { $link: cid },
    mimeType: typeof o.mimeType === 'string' ? o.mimeType : 'image/jpeg',
    size: typeof o.size === 'number' ? o.size : 0
  };
}

export function avatarUrl(did: string | null | undefined, ref: unknown): string | null {
  const cid = blobCid(ref);
  return did && cid ? `https://cdn.bsky.app/img/avatar/plain/${did}/${cid}@jpeg` : null;
}

export async function generatorAvatar(
  opts: { definition?: unknown; existing?: unknown; fromBuilder?: boolean },
  uploadDefault: () => Promise<unknown>
): Promise<BlobJson | undefined> {
  const def = toBlobJson(opts.definition);
  if (def) return def;
  if (!opts.fromBuilder) {
    const ex = toBlobJson(opts.existing);
    if (ex) return ex;
  }
  try {
    return toBlobJson(await uploadDefault()) ?? undefined;
  } catch (e) {
    console.warn('[avatar] default avatar upload failed', e);
    return undefined;
  }
}

export const AVATAR_MAX_BYTES = 1_000_000;

export const AVATAR_SIZE = 512;

export async function squareAvatar(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error(t('tfeeds_err_image_process'));

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  bitmap.close();
  for (const q of [0.9, 0.8, 0.7, 0.6]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', q));
    if (blob && blob.size <= AVATAR_MAX_BYTES) return blob;
  }
  throw new Error(t('tfeeds_err_image_too_large'));
}
