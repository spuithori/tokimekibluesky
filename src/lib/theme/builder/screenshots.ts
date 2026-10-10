import type { Agent } from '$lib/agent';
import { themesDb } from '$lib/db';
import { SCREENSHOT_KINDS, THEME_COLLECTION, type ScreenshotKind, type ThemeScreenshot } from '../format';
import { validateThemeRecord } from '../validate';
import { renderScreenshots, type RenderedScreenshot } from '../store';
import { localBlobRef, PublishError, uploadVerified, type Published } from './publish';

function toBlob(shot: RenderedScreenshot): Blob {
    const bytes = Uint8Array.from(atob(shot.data), (c) => c.charCodeAt(0));
    return new Blob([bytes], { type: shot.mimeType });
}

export interface ScreenshotPreview {
    kind: ScreenshotKind;
    blob: Blob;
}

export async function attachScreenshots(agent: Agent, published: Published): Promise<{ published: Published; previews: ScreenshotPreview[] }> {
    const rendered = (await renderScreenshots(agent, published.uri, published.cid))
        .filter((shot) => SCREENSHOT_KINDS.includes(shot.kind as ScreenshotKind));
    if (!rendered.length) throw new PublishError('invalid', 'no screenshots were returned');
    const screenshots: ThemeScreenshot[] = [];
    const previews: ScreenshotPreview[] = [];
    for (const shot of rendered) {
        const blob = toBlob(shot);
        const image = await localBlobRef(blob);
        await uploadVerified(agent, blob, image);
        screenshots.push({ kind: shot.kind as ScreenshotKind, image, aspectRatio: { width: shot.width, height: shot.height } });
        previews.push({ kind: shot.kind as ScreenshotKind, blob });
    }
    const result = validateThemeRecord({ ...published.installed.record, screenshots });
    if (!result.ok) throw new PublishError('invalid', 'the screenshots do not pass validation', result.errors);
    const written = await agent.xrpc.post('com.atproto.repo.putRecord', {
        repo: agent.did(),
        collection: THEME_COLLECTION,
        rkey: published.rkey,
        record: { ...result.record, $type: THEME_COLLECTION },
        swapRecord: published.cid,
    });
    const installed = { ...published.installed, cid: written.cid, record: result.record };
    await themesDb.themes.update(installed.id, { cid: written.cid, record: result.record });
    return { published: { ...published, cid: written.cid, installed }, previews };
}
