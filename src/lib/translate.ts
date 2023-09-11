export async function translate(text, lang = window.navigator.language) {
    const res = await fetch(`/api/translator`, {
        method: 'post',
        body: JSON.stringify({
            text: text,
            to: lang,
        })
    });
    const translation = await res.json();
    return translation[0].translations[0].text;
}