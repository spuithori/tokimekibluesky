<script lang="ts">
   import { preventDefault } from 'svelte/legacy';

    import {createEventDispatcher, onMount, onDestroy} from 'svelte'
    import {Editor} from '@tiptap/core'
    import Link from '@tiptap/extension-link';
    import Document from '@tiptap/extension-document';
    import Text from '@tiptap/extension-text';
    import Paragraph from '@tiptap/extension-paragraph';
    import HardBreak from '@tiptap/extension-hard-break';
    import Mention from '@tiptap/extension-mention';
    import { Placeholder, UndoRedo } from '@tiptap/extensions';
    import {TagDecorator} from "$lib/components/editor/hashtagDecorator";
    import {agent, timelineHashtags, hashtagHistory} from "$lib/stores";
    import MentionList from "$lib/components/editor/MentionList.svelte";
    import {jsonToText} from "$lib/components/editor/richtext";
    import HashtagList from "$lib/components/editor/HashtagList.svelte";
    import {Hashtag} from "$lib/components/editor/hashtag";
    import {TAG_REGEX, MENTION_REGEX} from '@atproto/api';
    const dispatch = createEventDispatcher();

  interface Props {
    json: any;
    text?: string;
    _agent?: any;
    isPublishEnabled: any;
    top?: import('svelte').Snippet;
    avatar?: import('svelte').Snippet;
    normal?: import('svelte').Snippet;
  }

  let {
    json = $bindable(),
    text = $bindable(''),
    _agent = $agent,
    isPublishEnabled,
    top,
    avatar,
    normal
  }: Props = $props();

    let element = $state();
    let editor;
    let mentionList = $state();
    let hashtagList = $state();

    let mentionsHistory = JSON.parse(localStorage.getItem('mentionsHistory')) || [];
    let mentionProps = $state();
    let hashtagProps = $state();
    let linkDialog = $state();
    let linkValue = $state('');
    let linkButtonDisabled = true;
    let scrollable = $state();

    onMount(() => {
        editor = new Editor({
            element: element,
            extensions: [
                Document.extend({
                    addKeyboardShortcuts() {
                        return {
                            'Escape': () => {
                                editor.commands.blur();
                            }
                        }
                    }
                }),
                Paragraph,
                Text,
                Link.extend({
                    inclusive: false,
                    parseHTML() {
                        return [
                            {
                                tag: 'a[href]:not([href *= "javascript:" i])',
                                getAttrs: node => {
                                    if (TAG_REGEX.test(node.textContent) || MENTION_REGEX.test(node.textContent)) {
                                        return false;
                                    }

                                    if (TAG_REGEX.test(node.textContent) || MENTION_REGEX.test(node.textContent)) {
                                        return false;
                                    }

                                    return null;
                                },
                            }
                        ]
                    }
                }).configure({
                    HTMLAttributes: {
                        class: 'editor-link',
                    },
                    autolink: true,
                    openOnClick: false,
                    linkOnPaste: true,
                }),
                HardBreak.extend({
                    addKeyboardShortcuts() {
                        return {
                            'Mod-Enter': () => {
                                dispatch('publish');
                            },
                        }
                    }
                }),
                Mention.configure({
                    HTMLAttributes: {
                        class: 'editor-mention',
                    },
                    suggestion: {
                        items: async ({query}) => {
                            if (!query) {
                                return mentionsHistory || [];
                            }

                            const res = await _agent.agent.api.app.bsky.actor.searchActorsTypeahead({term: query, limit: 6});
                            return res.data.actors.length ? res.data.actors : mentionsHistory;
                        },
                        render: () => {
                            return {
                                onStart: props => {
                                    if (!props.clientRect) {
                                        return
                                    }

                                    mentionProps = props;
                                },
                                onUpdate: props => {
                                    if (!props.clientRect) {
                                        return
                                    }

                                    mentionProps = props;
                                },
                                onExit() {
                                    mentionProps = null;
                                },
                                onKeyDown: props => {
                                    if (props.event.key === 'Escape') {
                                        mentionProps = null;
                                        return true;
                                    }

                                    return mentionList.handleKeyDown(props)
                                }
                            }
                        }
                    }
                }),
                TagDecorator,
                Hashtag.configure({
                    suggestion: {
                        items: async ({query}) => {
                            if (!query) {
                                return [...new Set([...$hashtagHistory, ...$timelineHashtags])];
                            }
                        },
                        render: () => {
                            return {
                                onStart: props => {
                                    if (!props.clientRect) {
                                        return
                                    }

                                    hashtagProps = props;
                                },
                                onUpdate: props => {
                                    if (!props.clientRect) {
                                        return
                                    }

                                    hashtagProps = props;
                                },
                                onExit() {
                                    hashtagProps = null;
                                },
                                onKeyDown: props => {
                                    if (props.event.key === 'Escape') {
                                        hashtagProps = null;
                                        return true;
                                    }

                                    return hashtagList.handleKeyDown(props)
                                }
                            }
                        }
                    }
                }),
                Placeholder.configure({
                    placeholder: '',
                }),
                UndoRedo,
            ],
            onTransaction: () => {
                editor = editor;
            },
            onSelectionUpdate: ({ editor }) => {
                const { view, state } = editor;
                const { from, to } = view.state.selection;
                const text = state.doc.textBetween(from, to, '');
                linkButtonDisabled = !text;
            },
            onUpdate: () => {
                json = editor.getJSON();
                text = jsonToText(json);
            },
            onFocus() {
                // dispatch('focus');
            },
        })
    })

    onDestroy(() => {
        if (editor) {
            editor.destroy();
        }
    })

    function addLink() {
        linkDialog.showModal();
    }

    function removeLink() {
        editor.chain().focus().unsetLink().run()
    }

    function submitLink(e) {
        if (linkDialog.returnValue) {
            editor.chain().focus().extendMarkRange('link').setLink({ href: linkDialog.returnValue }).focus('end').run();
        }

        linkValue = '';
    }

    export function clear() {
        editor.commands.clearContent(true);
    }

    export function focus() {
        editor.commands.focus();
    }

    export function blur() {
        editor.commands.blur();
    }

    export function setContent(content) {
        editor.commands.setContent(content, true);
    }

    function addHash() {
        editor.chain().focus().insertContent('#').run();
    }
</script>

<div class="chat-publish-form" bind:this={scrollable}>
  {@render top?.()}

  <div class="chat-editor-column">
    {@render avatar?.()}

    <div class="chat-editor" bind:this={element}></div>

    <button class="chat-editor-submit" disabled={isPublishEnabled} onclick={() => {dispatch('publish')}}>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--bg-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-send-horizontal"><path d="m3 3 3 9-3 9 19-9Z"/><path d="M6 12h16"/></svg>
    </button>
  </div>

  {@render normal?.()}
</div>

{#if (mentionProps)}
  <MentionList props={mentionProps} bind:this={mentionList}></MentionList>
{/if}

{#if (hashtagProps)}
  <HashtagList props={hashtagProps} bind:this={hashtagList}></HashtagList>
{/if}

<dialog class="editor-link-dialog" bind:this={linkDialog} onclose={submitLink}>
  <form>
    <input type="text" class="editor-link-dialog__input" bind:value={linkValue} placeholder="https://tokimeki.blue">
    <button class="editor-link-dialog__button" onclick={preventDefault(() => {linkDialog.close(linkValue)})}>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--bg-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-corner-down-left"><polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/></svg>
    </button>
  </form>

  <button class="modal-background-close" onclick={() => {linkDialog.close()}}></button>
</dialog>

<style lang="postcss">
    .chat-editor-column {
        display: grid;
        align-items: flex-start;
        grid-template-columns: 1fr 40px;
        gap: 8px;
    }

    .chat-editor {
        position: relative;
        background-color: var(--publish-textarea-bg-color);
        border-radius: 20px;
        border: 1px solid var(--border-color-1);
        padding: 2px 42px 4px 16px;
    }

    .chat-editor-submit {
        width: 40px;
        height: 40px;
        background-color: var(--primary-color);
        border-radius: 50%;
        display: grid;
        place-content: center;
    }
</style>