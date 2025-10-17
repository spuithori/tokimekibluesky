<script lang="ts">
  import {_} from 'svelte-i18n';
  import {onMount, onDestroy} from 'svelte'
  import {Editor} from '@tiptap/core'
  import Link from '@tiptap/extension-link';
  import Document from '@tiptap/extension-document';
  import Text from '@tiptap/extension-text';
  import Paragraph from '@tiptap/extension-paragraph';
  import HardBreak from '@tiptap/extension-hard-break';
  import Mention from '@tiptap/extension-mention';
  import Emoji, {emojis} from '@tiptap/extension-emoji';
  import { Placeholder, UndoRedo } from '@tiptap/extensions';
  import {TagDecorator} from "$lib/components/editor/hashtagDecorator";
  import {timelineHashtags, hashtagHistory} from "$lib/stores";
  import MentionList from "$lib/components/editor/MentionList.svelte";
  import EditorBar from "$lib/components/editor/EditorBar.svelte";
  import {jsonToText} from "$lib/components/editor/richtext";
  import HashtagList from "$lib/components/editor/HashtagList.svelte";
  import {Hashtag} from "$lib/components/editor/hashtag";
  import {TAG_REGEX, MENTION_REGEX} from '@atproto/api';
  import GifPickerModal from "$lib/components/publish/GifPickerModal.svelte";
  import {clipboardTextParser} from "$lib/components/editor/prosemirrorExtension";
  import {Clapperboard, Hash, ImagePlus, Laugh, Link as LinkIcon, Unlink} from "lucide-svelte";
  import EmojiList from "$lib/components/editor/EmojiList.svelte";

  interface Props {
    json: any;
    text?: string;
    _agent?: any;
    isEnabled: boolean;
    isVideoUploadEnabled: any;
    top?: import('svelte').Snippet;
    avatar?: import('svelte').Snippet;
    normal?: import('svelte').Snippet;
  }

  let {
    json = $bindable(),
    text = $bindable(''),
    _agent,
    isVideoUploadEnabled,
    top,
    avatar,
    normal,
    submitArea,
    onupload,
    onpicktenor,
    onpublish,
    publishContentLength,
  }: Props = $props();

    let element = $state();
    let editor = $state();
    let mentionList = $state();
    let hashtagList = $state();
    let emojiList = $state();

    let mentionsHistory = JSON.parse(localStorage.getItem('mentionsHistory')) || [];
    let mentionProps = $state();
    let hashtagProps = $state();
    let emojiProps = $state();
    let linkDialog = $state();
    let linkValue = $state('');
    let linkButtonDisabled = $state(true);
    let isGiphyPickerOpen = $state(false);
    let isLinkActive = $state(false);
    let isEmojiPickerOpen = $state(false);
    let isFocus = $state(false);

    $inspect(emojiList);

    onMount(() => {
        editor = new Editor({
            element: element,
            editorProps: {
                clipboardTextParser: clipboardTextParser,
            },
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
                                onpublish();
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
                    placeholder: $_('send_placeholder1'),
                }),
                UndoRedo,
                /* Emoji.configure({
                    emojis: emojis,
                    suggestion: {
                        items: ({editor, query}) => {
                            return editor.storage.emoji.emojis
                                .filter(({ shortcodes, tags }) => {
                                    return (
                                        shortcodes.find(shortcode => shortcode.startsWith(query.toLowerCase())) ||
                                        tags.find(tag => tag.startsWith(query.toLowerCase()))
                                    )
                                })
                                .slice(0, 5);
                        },
                        render: () => {
                            return {
                                onStart: props => {
                                    if (!props.clientRect) {
                                        return
                                    }

                                    emojiProps = props;
                                },
                                onUpdate: props => {
                                    if (!props.clientRect) {
                                        return
                                    }

                                    emojiProps = props;
                                },
                                onExit() {
                                    emojiProps = null;
                                },
                                onKeyDown: props => {
                                    if (props.event.key === 'Escape') {
                                        emojiProps = null;
                                        return true;
                                    }

                                    return emojiList.handleKeyDown(props)
                                }
                            }
                        }
                    }
                }) */
            ],
            onSelectionUpdate: ({ editor }) => {
                isLinkActive = editor.isActive('link');
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
                isFocus = true;
            },
            onBlur() {
                isFocus = false;
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

    export function focus(position = null) {
        editor.commands.focus(position);
    }

    export function blur() {
      editor.commands.blur();
    }

    export function setContent(content) {
       editor.commands.setContent(content, true);
    }

    function handlePickTenor(gif) {
        isGiphyPickerOpen = false;

        onpicktenor(gif);
    }

    function addHash() {
        editor.chain().focus().insertContent('#').run();
    }

    function handleEmojiPick(emoji) {
        editor.commands.insertContent(emoji.native);
    }
</script>

{@render top?.()}

<div class="editor-column">
  {@render avatar?.()}

  <div class="editor" bind:this={element}></div>
</div>

{@render normal?.()}

<EditorBar {isFocus} {submitArea}>
  {#snippet top()}
      {#if (isLinkActive)}
        <button class="editor-menu-button" onclick={removeLink}>
          <Unlink size="20" color="var(--publish-tool-button-color)"></Unlink>
        </button>
      {:else}
        <button class="editor-menu-button" onclick={addLink} disabled={linkButtonDisabled}>
          <LinkIcon size="20" color="var(--publish-tool-button-color)"></LinkIcon>
        </button>
      {/if}

      <button class="editor-menu-button" onclick={() => {onupload(true)}} disabled={!isVideoUploadEnabled}>
        <Clapperboard size="20" color="var(--publish-tool-button-color)"></Clapperboard>
      </button>

      <button class="editor-menu-button" onclick={() => {onupload(false)}}>
        <ImagePlus size="20" color="var(--publish-tool-button-color)"></ImagePlus>
      </button>

      <button class="editor-menu-button" onclick={() => {isGiphyPickerOpen = true}}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 64 64">
          <g id="icon-gif" transform="translate(-125 -223)">
            <rect id="長方形_269" data-name="長方形 269" width="64" height="64" transform="translate(125 223)" fill="none"/>
            <path id="パス_81" data-name="パス 81" d="M19.892-4.126H15.035a1.379,1.379,0,0,1-.992-.387,2,2,0,0,1-.588-1.529,1.748,1.748,0,0,1,.79-1.613,1.417,1.417,0,0,1,.79-.218h6.807A2.332,2.332,0,0,1,24.5-5.252V3.622A1.952,1.952,0,0,1,24.144,4.8a1.854,1.854,0,0,1-1.58.689q-1.95,0-1.95-1.832V1.387Q18.565,5.723,12.9,5.723A10.483,10.483,0,0,1,3.859,1.286,14.484,14.484,0,0,1,1.371-7.386a13.388,13.388,0,0,1,3.143-9.059,11.784,11.784,0,0,1,9.412-4.134,12.7,12.7,0,0,1,6.067,1.5,7.722,7.722,0,0,1,2.79,2.319,2.749,2.749,0,0,1,.555,1.546,2.027,2.027,0,0,1-.924,1.664,2.278,2.278,0,0,1-1.378.471,1.911,1.911,0,0,1-1.563-.756,6.985,6.985,0,0,0-5.647-2.74A6.618,6.618,0,0,0,7.69-13.134a11.141,11.141,0,0,0-1.361,5.7A10.817,10.817,0,0,0,7.775-1.672a6.255,6.255,0,0,0,5.58,3.261Q17.96,1.589,19.892-4.126ZM33.077-16.512H30.556a1.311,1.311,0,0,1-.941-.37,1.8,1.8,0,0,1-.538-1.378,1.671,1.671,0,0,1,.723-1.513,1.306,1.306,0,0,1,.756-.218h9.7a1.391,1.391,0,0,1,.975.37,1.8,1.8,0,0,1,.521,1.378,1.7,1.7,0,0,1-.723,1.513,1.336,1.336,0,0,1-.773.218h-2.5V1.656h2.5a1.391,1.391,0,0,1,.975.37A1.8,1.8,0,0,1,41.749,3.4a1.7,1.7,0,0,1-.723,1.513,1.336,1.336,0,0,1-.773.218h-9.7a1.311,1.311,0,0,1-.941-.37,1.765,1.765,0,0,1-.538-1.378A1.671,1.671,0,0,1,29.8,1.874a1.306,1.306,0,0,1,.756-.218h2.521ZM51.741-5.4V3.622A1.7,1.7,0,0,1,51.4,4.664a2.4,2.4,0,0,1-2.034.857,2.521,2.521,0,0,1-1.866-.672,1.664,1.664,0,0,1-.487-1.227V-16.445q0-3.546,3.546-3.546H63.69a1.462,1.462,0,0,1,1.076.437,2.1,2.1,0,0,1,.605,1.58,2,2,0,0,1-.874,1.832,1.5,1.5,0,0,1-.807.218H52.363a.55.55,0,0,0-.622.622v5.983H62.094a1.425,1.425,0,0,1,1.025.4,2.1,2.1,0,0,1,.605,1.58A1.866,1.866,0,0,1,62.867-5.6a1.419,1.419,0,0,1-.773.2Z" transform="translate(123.629 262.428)" fill="var(--publish-tool-button-color)"/>
          </g>
        </svg>
      </button>

      <button class="editor-menu-button only-mobile" onclick={addHash}>
        <Hash size="20" color="var(--publish-tool-button-color)"></Hash>
      </button>

      <button class="editor-menu-button" onclick={() => {isEmojiPickerOpen = !isEmojiPickerOpen}}>
        <Laugh size="20" color="var(--publish-tool-button-color)"></Laugh>
      </button>

      <p class="publish-length" class:over={publishContentLength > 300}>{300 - publishContentLength}</p>
  {/snippet}
</EditorBar>

{#if (isEmojiPickerOpen)}
    {#await import('$lib/components/publish/EmojiPicker.svelte') then { default: EmojiPicker }}
        <EmojiPicker onpick={handleEmojiPick} onoutclick={() => {isEmojiPickerOpen = !isEmojiPickerOpen}}></EmojiPicker>
    {/await}
{/if}

{#if (isGiphyPickerOpen)}
  <GifPickerModal
    onclose={() => {isGiphyPickerOpen = false}}
    onpicktenor={handlePickTenor}
  ></GifPickerModal>
{/if}

{#if (mentionProps)}
  <MentionList props={mentionProps} bind:this={mentionList}></MentionList>
{/if}

{#if (hashtagProps)}
  <HashtagList props={hashtagProps} bind:this={hashtagList}></HashtagList>
{/if}

{#if (emojiProps)}
  <EmojiList props={emojiProps} bind:this={emojiList}></EmojiList>
{/if}

<dialog class="editor-link-dialog" bind:this={linkDialog} onclose={submitLink}>
  <form>
    <input type="text" class="editor-link-dialog__input" bind:value={linkValue} placeholder="https://tokimeki.blue">
    <button class="editor-link-dialog__button" onclick={() => {linkDialog.close(linkValue)}}>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--bg-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-corner-down-left"><polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/></svg>
    </button>
  </form>
  
  <button class="modal-background-close" onclick={() => {linkDialog.close()}}></button>
</dialog>

<style lang="postcss">
    :global {
        .editor-menu-button {
            display: grid;
            place-content: center;
            height: 32px;
            width: 32px;

            &:disabled {
                opacity: .5;
            }
        }
    }

    .editor-link-dialog {
        background-color: var(--bg-color-1);
        padding: 8px 16px;
        border-radius: var(--border-radius-3);
        border: none;
        box-shadow: 0 0 10px var(--box-shadow-color-1);
        position: absolute;
        z-index: 100;
        margin: auto;

        form {
            position: relative;
            z-index: 2;
        }

        &::backdrop {
            background-color: rgba(0, 0, 0, .6);
        }

        form {
            display: flex;
            gap: 8px;
        }

        &__input {
            height: 36px;
            color: var(--text-color-1);
            outline: none;

            &::placeholder {
                color: var(--text-color-3);
            }
        }

        &__button {
            height: 36px;
            width: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: var(--primary-color);
            border-radius: var(--border-radius-2);
        }
    }

    .editor-column {
        display: grid;
        grid-template-columns: 40px 1fr;
        gap: 8px;
        padding: 16px;
    }

    .publish-length {
        color: var(--publish-length-color);
        display: flex;
        align-items: center;
        margin-right: auto;
        white-space: nowrap;
        pointer-events: none;
        cursor: default;

        &.over {
            font-weight: bold;
            color: var(--danger-color);
        }
    }
</style>