import { settingsStore } from "$lib/settings/settings.svelte";
import { aiEndpoint, isAutoColumnIconEnabled } from "$lib/ai-policy";
import { aiConsent } from "$lib/ai/consent.svelte";

export async function requestColumnIcon(name: string, description: string): Promise<string | null> {
    if (!isAutoColumnIconEnabled(settingsStore.general)) {
        return null;
    }

    const res = await fetch(aiEndpoint('columnIcon', {
        name: name.slice(0, 100),
        description: description.slice(0, 300),
    }), { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
        return null;
    }
    const { icon } = await res.json();
    return typeof icon === 'string' && icon ? icon : null;
}

export async function requestAltText(image: Blob, category: 'ocr' | 'description', language: string): Promise<string | null> {
    if (!(await aiConsent.ensure('altText'))) {
        return null;
    }

    const res = await fetch(aiEndpoint('altText', { category, language }), {
        method: 'POST',
        headers: { 'Content-Type': image.type },
        body: image,
        signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
        throw new Error(`alt ${res.status}`);
    }
    const { text } = await res.json();
    return typeof text === 'string' ? text : '';
}
