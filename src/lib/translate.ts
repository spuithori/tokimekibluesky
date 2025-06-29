import {RichText} from "@atproto/api";
import {settingsState} from "$lib/classes/settingsState.svelte";

export async function translate(text, lang = window.navigator.language, _agent) {

    const res = await fetch(`/api/translator`, {
        method: 'post',
        body: JSON.stringify({
            text: text,
            to: lang,
            model: settingsState?.settings?.translationModel,
        })
    });
    const translation = await res.json();
    const translatedText = await translation[0].translations[0].text;

    const rt = new RichText({text: translatedText});
    await rt.detectFacets(_agent.agent);

    return {
        text: rt.text,
        facets: rt.facets,
    }
}

export async function formatTranslateRecord(text, lang = window.navigator.language, _agent, record) {
    const t = await translate(text, lang, _agent);
    return {
        ...record,
        text: t.text,
        facets: t.facets,
    }
}

export async function languageDetect(text) {
    try {
        const res = await fetch(`/api/language-detect`, {
            method: 'post',
            body: JSON.stringify({
                text: text,
            })
        });
        const langs = await res.json() as { lang: string; }[];

        if (langs.length) {
            return langs.map(lg => lg.lang);
        } else {
            return [];
        }
    } catch (e) {
        console.error(e);
        return [];
    }
}