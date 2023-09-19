import {RichText} from "@atproto/api";

export async function translate(text, lang = window.navigator.language, _agent) {

    const res = await fetch(`/api/translator`, {
        method: 'post',
        body: JSON.stringify({
            text: text,
            to: lang,
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
