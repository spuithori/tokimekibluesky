import {Node} from '@tiptap/core';
import type {DOMOutputSpec, Node as ProseMirrorNode} from '@tiptap/pm/model';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion, {type SuggestionOptions } from '@tiptap/suggestion';
import {EMOJI_LIST} from "$lib/components/editor/emojiData";

export type EmojiOptions = {
    HTMLAttributes: Record<string, any>
    /** @deprecated use renderText and renderHTML instead  */
    renderLabel?: (props: { options: EmojiOptions; node: ProseMirrorNode }) => string
    renderText: (props: { options: EmojiOptions; node: ProseMirrorNode }) => string
    renderHTML: (props: { options: EmojiOptions; node: ProseMirrorNode }) => DOMOutputSpec
    deleteTriggerWithBackspace: boolean
    suggestion: Omit<SuggestionOptions, 'editor'>
}

export const EmojiPluginKey = new PluginKey('emoji');

export const Emoji = Node.create<EmojiOptions>({
    name: 'emoji',
    group: 'inline',
    inline: true,
    addOptions() {
        return {
            HTMLAttributes: {},
            suggestion: {
                char: ':',
                pluginKey: EmojiPluginKey,
                command: ({ editor, range, props }) => {
                    const nodeAfter = editor.view.state.selection.$to.nodeAfter
                    const overrideSpace = nodeAfter?.text?.startsWith(' ')

                    if (overrideSpace) {
                        range.to += 1
                    }

                    console.log(props);

                    editor
                        .chain()
                        .focus()
                        .insertContentAt(range, [
                            {
                                type: 'text',
                                text: props.emoji,
                            },
                        ])
                        .run()

                    window.getSelection()?.collapseToEnd()
                },
                allow: ({ state, range }) => {
                    const $from = state.doc.resolve(range.from);
                    const type = state.schema.nodes[this.name];
                    const allow = !!$from.parent.type.contentMatch.matchType(type);

                    return allow;
                },
            },
        }
    },
    addStorage() {
        return {
            emojis: EMOJI_LIST,
        }
    },
    addProseMirrorPlugins() {
        return [
            Suggestion({
                editor: this.editor,
                ...this.options.suggestion,
            }),
        ]
    },
})