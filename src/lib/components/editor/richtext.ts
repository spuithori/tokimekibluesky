import {Facet, UnicodeString} from "@atproto/api";
import {SimpleRichText} from "$lib/components/editor/SimpleRichText";

export async function detectRichTextWithEditorJson(_agent, text, json) {
    const rt = new SimpleRichText({text: text});
    await rt.detectFacetsWithoutLinks(_agent.agent);
    const linkFacets: Facet[] = detectLinkFacets(json);
    if (Array.isArray(rt.facets)) {
        rt.facets = [...rt.facets, ...linkFacets];
    } else {
        rt.facets = [...linkFacets];
    }

    return rt;
}

function detectLinkFacets(json): Facet[] {
    const content = json.content;
    let length = 0;
    let facets = [];

    content.forEach(p => {
        if (p.content){
            p.content.forEach(item => {
                if (item.marks) {
                    item.marks.forEach(mark => {
                        facets = [...facets, detectFacetFromMark(mark, item.text, length)]
                    })
                }

                if (item.type === 'hardBreak') {
                    length = length + getByteLength('\n');
                }

                if (item.text) {
                    length = length + getByteLength(item.text);
                }

                if (item.type === 'mention') {
                    length = length + getByteLength('@' + item.attrs.id);
                }
            })
        }
    })

    return facets;
}

function getByteLength(string: string) {
    const Unicode = new UnicodeString(string);
    return Unicode.length;
}

function detectFacetFromMark(mark, text, length) {
    if (mark.type !== 'link') {
        return undefined;
    }

    const link = mark.attrs.href;
    const byteStart = length;
    const byteEnd = length + getByteLength(text);

    return {
        index: { byteStart, byteEnd },
        features: [{
            $type: "app.bsky.richtext.facet#link",
            uri: link,
        }]
    }
}
