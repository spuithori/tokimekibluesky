/**
 * Copyright 2023–2024 Bluesky PBC (MIT License)
 * https://github.com/bluesky-social/social-app/blob/5d19f27052ebd3642db58742f7efaaee0b3a6720/src/view/com/composer/text-input/web/TagDecorator.ts
 */
import {Mark} from '@tiptap/core';
import {Plugin, PluginKey} from '@tiptap/pm/state';
import {Node as ProsemirrorNode} from '@tiptap/pm/model';
import {Decoration, DecorationSet} from '@tiptap/pm/view';
import {TAG_REGEX, TRAILING_PUNCTUATION_REGEX} from '@atproto/api';

function getDecorations(doc: ProsemirrorNode) {
    const decorations: Decoration[] = []

    doc.descendants((node, pos) => {
        if (node.isText && node.text) {
            const regex = TAG_REGEX
            const textContent = node.textContent

            let match
            while ((match = regex.exec(textContent))) {
                const [matchedString, _, tag] = match

                if (!tag || tag.replace(TRAILING_PUNCTUATION_REGEX, '').length > 64)
                    continue

                const [trailingPunc = ''] = tag.match(TRAILING_PUNCTUATION_REGEX) || []
                const matchedFrom = match.index + matchedString.indexOf(tag)
                const matchedTo = matchedFrom + (tag.length - trailingPunc.length)

                /*
                 * The match is exclusive of `#` so we need to adjust the start of the
                 * highlight by -1 to include the `#`
                 */
                const start = pos + matchedFrom - 1
                const end = pos + matchedTo

                decorations.push(
                    Decoration.inline(start, end, {
                        class: 'editor-hashtag',
                    }),
                )
            }
        }
    })

    return DecorationSet.create(doc, decorations)
}

const tagDecoratorPlugin: Plugin = new Plugin({
    key: new PluginKey('link-decorator'),

    state: {
        init: (_, {doc}) => getDecorations(doc),
        apply: (transaction, decorationSet) => {
            if (transaction.docChanged) {
                return getDecorations(transaction.doc)
            }
            return decorationSet.map(transaction.mapping, transaction.doc)
        },
    },

    props: {
        decorations(state) {
            return tagDecoratorPlugin.getState(state)
        },
    },
})

export const TagDecorator = Mark.create({
    name: 'tag-decorator',
    priority: 1000,
    keepOnSplit: false,
    inclusive() {
        return true
    },
    addProseMirrorPlugins() {
        return [
            tagDecoratorPlugin,
        ]
    },
})