// @vitest-environment jsdom
import {describe, expect, it} from 'vitest';
import {Editor} from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import HardBreak from '@tiptap/extension-hard-break';
import Link from '@tiptap/extension-link';
import {detectRichTextWithEditorJson, escapeHtml, jsonToText, textToJson} from './richtext';

function createEditor() {
    return new Editor({
        element: document.createElement('div'),
        extensions: [Document, Paragraph, Text, HardBreak, Link.configure({autolink: true})],
    });
}

const agent = {resolveHandle: async () => undefined};

describe('textToJson', () => {
    it('改行・空行・山括弧・実体参照をエディタ往復で失わない', () => {
        const editor = createEditor();
        const text = 'line1\nline2\n\nif a<b and c>d\nAT&amp;T';

        editor.commands.setContent(textToJson(text));

        expect(jsonToText(editor.getJSON())).toBe(text);
    });

    it('URL のリンク facet がプレーンテキスト検出と同じ位置・URI になる', async () => {
        const editor = createEditor();
        const text = 'こんにちは https://example.com/a?b=1 です\n2行目 example.org を見て';

        editor.commands.setContent(textToJson(text));
        const json = editor.getJSON();
        const fromJson = await detectRichTextWithEditorJson(agent, jsonToText(json), json);
        const fromText = await detectRichTextWithEditorJson(agent, text, undefined);

        expect(fromJson.facets).toEqual(fromText.facets);
        expect(fromJson.facets).toHaveLength(2);
    });
});

describe('escapeHtml', () => {
    it('HTML として setContent しても元の文字列が残る', () => {
        const editor = createEditor();
        const text = 'if a<b and c>d & "q" &amp;';

        editor.commands.setContent(escapeHtml(text));

        expect(jsonToText(editor.getJSON())).toBe(text);
    });
});
