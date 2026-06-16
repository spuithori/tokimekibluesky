import { RichText } from "$lib/atproto-richtext";
import { settingsState } from "$lib/classes/settingsState.svelte";

const encoder = new TextEncoder();
export const HAS_LETTER = /\p{L}/u;

export async function buildTranslatedRecord(
    record: any,
    translateProse: (prose: string) => Promise<string | null>,
) {
    const rt = new RichText({ text: record.text, facets: record.facets });
    const segments = [...rt.segments()];

    const proseResults = await Promise.all(
        segments.map((segment) =>
            segment.facet ? Promise.resolve("") : translateProse(segment.text),
        ),
    );

    let newText = "";
    const newFacets: Array<{
        $type?: string;
        index: { byteStart: number; byteEnd: number };
        features: any[];
    }> = [];

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];

        if (segment.facet) {
            const byteStart = encoder.encode(newText).byteLength;
            newText += segment.text;
            const byteEnd = encoder.encode(newText).byteLength;
            newFacets.push({ ...segment.facet, index: { byteStart, byteEnd } });
            continue;
        }

        const translated = proseResults[i];
        if (translated == null) {
            return null;
        }
        newText += translated;
    }

    return {
        ...record,
        text: newText,
        facets: newFacets.length ? newFacets : undefined,
    };
}

async function translateTextServer(
    text: string,
    lang: string,
): Promise<string> {
    const res = await fetch(`/api/translator`, {
        method: "post",
        body: JSON.stringify({
            text: text,
            to: lang,
            model: settingsState?.settings?.translationModel,
        }),
    });
    const translation = await res.json();
    return translation[0].translations[0].text;
}

// Server (Google) translation. Entities are preserved by buildTranslatedRecord; prose runs
// without letters (emoji / symbols only) are skipped so they are not billed or corrupted.
export async function formatTranslateRecord(
    text: string,
    lang = window.navigator.language,
    _agent: any,
    record: any,
) {
    return buildTranslatedRecord(record ?? { text }, async (prose) => {
        if (!HAS_LETTER.test(prose)) {
            return prose;
        }
        return translateTextServer(prose, lang);
    });
}

export async function languageDetect(text) {
    try {
        const res = await fetch(`/api/language-detect`, {
            method: "post",
            body: JSON.stringify({
                text: text,
            }),
        });
        const langs = (await res.json()) as { lang: string }[];

        if (langs.length) {
            return langs.map((lg) => lg.lang);
        } else {
            return [];
        }
    } catch (e) {
        console.error(e);
        return [];
    }
}
