<script lang="ts">
    import {_} from 'svelte-i18n';
    import {createEventDispatcher, onMount, onDestroy} from 'svelte'
    import {Editor} from '@tiptap/core'
    import Link from '@tiptap/extension-link';
    import Document from '@tiptap/extension-document';
    import Text from '@tiptap/extension-text';
    import Paragraph from '@tiptap/extension-paragraph';
    import HardBreak from '@tiptap/extension-hard-break';
    import Mention from '@tiptap/extension-mention';
    import Placeholder from '@tiptap/extension-placeholder';
    import History from  '@tiptap/extension-history';
    import {TagDecorator} from "$lib/components/editor/hashtagDecorator";
    import {agent, timelineHashtags, hashtagHistory} from "$lib/stores";
    import MentionList from "$lib/components/editor/MentionList.svelte";
    import EditorBar from "$lib/components/editor/EditorBar.svelte";
    import {jsonToText} from "$lib/components/editor/richtext";
    import HashtagList from "$lib/components/editor/HashtagList.svelte";
    import {Hashtag} from "$lib/components/editor/hashtag";
    import {TAG_REGEX, MENTION_REGEX} from '@atproto/api';
    const dispatch = createEventDispatcher();

    export let json;
    export let text = '';
    export let _agent = $agent;
    export let isPublishEnabled;

    let element;
    let editor;
    let mentionList;
    let hashtagList;

    let mentionsHistory = JSON.parse(localStorage.getItem('mentionsHistory')) || [];
    let mentionProps;
    let hashtagProps;
    let linkDialog;
    let linkValue = '';
    let linkButtonDisabled = true;
    let scrollable;

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
                History,
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
  <slot name="top"></slot>

  <div class="chat-editor-column">
    <slot name="avatar"></slot>

    <div class="chat-editor" bind:this={element}>
      <!-- <button class="chat-editor-stamp-button">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-stamp"><path d="M5 22h14"/><path d="M19.27 13.73A2.5 2.5 0 0 0 17.5 13h-11A2.5 2.5 0 0 0 4 15.5V17a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1.5c0-.66-.26-1.3-.73-1.77Z"/><path d="M14 13V8.5C14 7 15 7 15 5a3 3 0 0 0-3-3c-1.66 0-3 1-3 3s1 2 1 3.5V13"/></svg>
      </button> -->
    </div>

    <button class="chat-editor-submit" disabled={isPublishEnabled} on:click={() => {dispatch('publish')}}>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--bg-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-send-horizontal"><path d="m3 3 3 9-3 9 19-9Z"/><path d="M6 12h16"/></svg>
    </button>
  </div>

  <slot name="normal"></slot>
</div>

{#if (mentionProps)}
  <MentionList props={mentionProps} bind:this={mentionList}></MentionList>
{/if}

{#if (hashtagProps)}
  <HashtagList props={hashtagProps} bind:this={hashtagList}></HashtagList>
{/if}

<dialog class="editor-link-dialog" bind:this={linkDialog} on:close={submitLink}>
  <form>
    <input type="text" class="editor-link-dialog__input" bind:value={linkValue} placeholder="https://tokimeki.blue">
    <button class="editor-link-dialog__button" on:click|preventDefault={() => {linkDialog.close(linkValue)}}>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--bg-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-corner-down-left"><polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/></svg>
    </button>
  </form>

  <button class="modal-background-close" on:click={() => {linkDialog.close()}}></button>
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

    .chat-editor-stamp-button {
        position: absolute;
        right: 8px;
        width: 28px;
        top: 0;
        bottom: 0;
        margin: auto;
    }
</style>