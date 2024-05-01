import { Node } from '@tiptap/core';
import type {DOMOutputSpec, Node as ProseMirrorNode} from '@tiptap/pm/model';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion, {type SuggestionOptions } from '@tiptap/suggestion';

export type HashtagOptions = {
    HTMLAttributes: Record<string, any>
    /** @deprecated use renderText and renderHTML instead  */
    renderLabel?: (props: { options: HashtagOptions; node: ProseMirrorNode }) => string
    renderText: (props: { options: HashtagOptions; node: ProseMirrorNode }) => string
    renderHTML: (props: { options: HashtagOptions; node: ProseMirrorNode }) => DOMOutputSpec
    deleteTriggerWithBackspace: boolean
    suggestion: Omit<SuggestionOptions, 'editor'>
}

export const HashtagPluginKey = new PluginKey('hashtag');

export const Hashtag = Node.create<HashtagOptions>({
    name: 'hashtag',
    group: 'inline',
    inline: true,
    addOptions() {
        return {
            HTMLAttributes: {},
            suggestion: {
                char: '#',
                pluginKey: HashtagPluginKey,
                command: ({ editor, range, props }) => {
                    // increase range.to by one when the next node is of type "text"
                    // and starts with a space character
                    const nodeAfter = editor.view.state.selection.$to.nodeAfter
                    const overrideSpace = nodeAfter?.text?.startsWith(' ')

                    if (overrideSpace) {
                        range.to += 1
                    }

                    editor
                        .chain()
                        .focus()
                        .insertContentAt(range, [
                            {
                                type: 'text',
                                text: '#',
                            },
                            {
                                type: 'text',
                                text: props.id,
                            },
                            {
                                type: 'text',
                                text: ' ',
                            },
                        ])
                        .run()

                    window.getSelection()?.collapseToEnd()
                },
                allow: ({ state, range }) => {
                    const $from = state.doc.resolve(range.from)
                    const type = state.schema.nodes[this.name]
                    const allow = !!$from.parent.type.contentMatch.matchType(type)

                    return allow
                },
            },
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