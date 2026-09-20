import {UnicodeString, detectFacets} from "$lib/atproto-richtext";
import type {Facet} from "$lib/atproto-richtext";
import {SimpleRichText} from "$lib/components/editor/SimpleRichText";

export async function detectRichTextWithEditorJson(_agent, text, json) {
    const rt = new SimpleRichText({text: text});
    await rt.detectFacetsWithoutLinks((handle: string) => _agent.resolveHandle(handle));
    const linkFacets: Facet[] = Array.isArray(json?.content)
        ? detectLinkFacets(json)
        : detectLinkFacetsFromText(text);
    if (Array.isArray(rt.facets)) {
        rt.facets = [...rt.facets, ...linkFacets];
    } else {
        rt.facets = [...linkFacets];
    }

    return rt;
}

function detectLinkFacets(json): Facet[] {
    const content = json?.content;
    if (!Array.isArray(content)) return [];

    let length = 0;
    let facets = [];

    content.forEach((p, index) => {
        if (index > 0) {
            length = length + getByteLength('\n');
        }

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

function detectLinkFacetsFromText(text: string): Facet[] {
    const facets = detectFacets(new UnicodeString(text));
    if (!facets) return [];
    return facets.filter(facet => facet.features[0]?.$type === 'app.bsky.richtext.facet#link');
}

export function jsonToText(json) {
    const content = json?.content;
    if (!Array.isArray(content)) return '';

    let text = '';

    content.forEach((p, index) => {
        if (index > 0) {
            text = text + '\n';
        }

        if (p.content){
            p.content.forEach(item => {
                if (item.type === 'hardBreak') {
                    text = text + '\n';
                }

                if (item.text) {
                    text = text + item.text;
                }

                if (item.type === 'mention') {
                    text = text + '@' + item.attrs.id;
                }
            })
        }
    })

    return text;
}

export function textToJson(text: string) {
    return {
        type: 'doc',
        content: text.split(/\r\n?|\n/).map(line => {
            return line ? {type: 'paragraph', content: lineToNodes(line)} : {type: 'paragraph'};
        }),
    };
}

function lineToNodes(line: string) {
    const unicode = new UnicodeString(line);
    const facets = detectLinkFacetsFromText(line).sort((a, b) => a.index.byteStart - b.index.byteStart);
    const nodes = [];
    let cursor = 0;

    facets.forEach(facet => {
        const {byteStart, byteEnd} = facet.index;
        if (byteStart < cursor) return;

        if (byteStart > cursor) {
            nodes.push({type: 'text', text: unicode.slice(cursor, byteStart)});
        }

        nodes.push({
            type: 'text',
            text: unicode.slice(byteStart, byteEnd),
            marks: [{type: 'link', attrs: {href: facet.features[0].uri}}],
        });
        cursor = byteEnd;
    });

    if (cursor < unicode.length) {
        nodes.push({type: 'text', text: unicode.slice(cursor)});
    }

    return nodes;
}

export function escapeHtml(text: string) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
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
