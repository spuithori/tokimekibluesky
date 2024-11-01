<script lang="ts">
  import { preventDefault } from 'svelte/legacy';

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
    import {agent, sharedText, replyRef, timelineHashtags, hashtagHistory} from "$lib/stores";
    import MentionList from "$lib/components/editor/MentionList.svelte";
    import EditorBar from "$lib/components/editor/EditorBar.svelte";
    import {jsonToText} from "$lib/components/editor/richtext";
    import HashtagList from "$lib/components/editor/HashtagList.svelte";
    import {Hashtag} from "$lib/components/editor/hashtag";
    import {TAG_REGEX, MENTION_REGEX} from '@atproto/api';
    import GifPickerModal from "$lib/components/publish/GifPickerModal.svelte";
    import {clipboardTextParser} from "$lib/components/editor/prosemirrorExtension";
    const dispatch = createEventDispatcher();

  interface Props {
    json: any;
    text?: string;
    _agent?: any;
    isPublishEnabled: any;
    isVideoUploadEnabled: any;
    top?: import('svelte').Snippet;
    avatar?: import('svelte').Snippet;
    normal?: import('svelte').Snippet;
  }

  let {
    json = $bindable(),
    text = $bindable(''),
    _agent = $agent,
    isPublishEnabled,
    isVideoUploadEnabled,
    top,
    avatar,
    normal
  }: Props = $props();

    let element = $state();
    let editor = $state();
    let mentionList = $state();
    let hashtagList = $state();

    let mentionsHistory = JSON.parse(localStorage.getItem('mentionsHistory')) || [];
    let mentionProps = $state();
    let hashtagProps = $state();
    let linkDialog = $state();
    let linkValue = $state('');
    let linkButtonDisabled = $state(true);
    let scrollable = $state();
    let isGiphyPickerOpen = $state(false);

    $effect(() => {
        addSharedText($sharedText);
    })

    $effect(() => {
        changePlaceholder($replyRef);
    })

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
                    placeholder: $_('send_placeholder1'),
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

    function changePlaceholder(replyRef) {
        const placeholder = replyRef && typeof replyRef !== 'string'
            ? $_('send_placeholder_reply', {values: {name: replyRef.data.parent.author.displayName || replyRef.data.parent.author.handle }})
            : $_('send_placeholder1');

        if (!editor?.extensionManager) {
            return false;
        }

        if (editor !== null && placeholder !== '') {
            editor.extensionManager.extensions.filter(
                (extension) => extension.name === 'placeholder'
            )[0].options['placeholder'] = placeholder;
            editor.view.dispatch(editor.state.tr);
        }
    }

    function addSharedText(text) {
        if (!$sharedText) {
            return false;
        }

        setTimeout(() => {
            editor.chain().setContent(text, true).focus().run();
            sharedText.set('');
            dispatch('focus');
        }, 200);
    }

    function addLink() {
        linkDialog.showModal();
    }

    function removeLink() {
        editor.chain().focus().unsetLink().run()
    }

    function addImage() {
        dispatch('upload', {
            isVideo: false,
        });
    }

    function addVideo() {
        dispatch('upload', {
            isVideo: true,
        })
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

    function handlePickGiphy(e) {
        isGiphyPickerOpen = false;

        dispatch('pickgiphy', {
            gif: e.detail.gif,
        })
    }

    function handlePickTenor(e) {
        isGiphyPickerOpen = false;

        dispatch('picktenor', {
            gif: e.detail.gif,
        })
    }

    function addHash() {
        editor.chain().focus().insertContent('#').run();
    }
</script>

<div class="publish-form-scrollable" bind:this={scrollable}>
  {@render top?.()}

  <div class="editor-column">
    {@render avatar?.()}

    <div class="editor" bind:this={element}></div>
  </div>

  {@render normal?.()}
</div>

<EditorBar on:emojiPicked={(e) => {editor.commands.insertContent(e.detail.emoji)}} {_agent}>
  {#snippet top()}
  
      <nav class="editor-menu-wrap">
        <ul class="editor-menu">
          {#if (editor)}
            {#if (editor.isActive('link'))}
              <li class="editor-menu__item">
                <button class="editor-menu__button" onclick={removeLink}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-unlink"><path d="m18.84 12.25 1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71"/><path d="m5.17 11.75-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71"/><line x1="8" x2="8" y1="2" y2="5"/><line x1="2" x2="5" y1="8" y2="8"/><line x1="16" x2="16" y1="19" y2="22"/><line x1="19" x2="22" y1="16" y2="16"/></svg>
                </button>
              </li>
            {:else}
              <li class="editor-menu__item">
                <button class="editor-menu__button" onclick={addLink} disabled={linkButtonDisabled}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-link"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                </button>
              </li>
            {/if}
          {/if}
        </ul>
      </nav>

      <div class="publish-form-image-add">
        <button class="publish-form-image-add-button" onclick={addVideo} disabled={!isVideoUploadEnabled}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--publish-tool-button-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clapperboard"><path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z"/><path d="m6.2 5.3 3.1 3.9"/><path d="m12.4 3.4 3.1 4"/><path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg>
        </button>
      </div>

      <div class="publish-form-image-add">
        <button class="publish-form-image-add-button" onclick={addImage}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--publish-tool-button-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image-plus"><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/><line x1="16" x2="22" y1="5" y2="5"/><line x1="19" x2="19" y1="2" y2="8"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
        </button>
      </div>

      <div class="publish-form-gif">
        <button class="publish-form-image-add-button" onclick={() => {isGiphyPickerOpen = true}}>
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
            <g id="icon-gif" transform="translate(-125 -223)">
              <rect id="長方形_269" data-name="長方形 269" width="64" height="64" transform="translate(125 223)" fill="none"/>
              <path id="パス_81" data-name="パス 81" d="M19.892-4.126H15.035a1.379,1.379,0,0,1-.992-.387,2,2,0,0,1-.588-1.529,1.748,1.748,0,0,1,.79-1.613,1.417,1.417,0,0,1,.79-.218h6.807A2.332,2.332,0,0,1,24.5-5.252V3.622A1.952,1.952,0,0,1,24.144,4.8a1.854,1.854,0,0,1-1.58.689q-1.95,0-1.95-1.832V1.387Q18.565,5.723,12.9,5.723A10.483,10.483,0,0,1,3.859,1.286,14.484,14.484,0,0,1,1.371-7.386a13.388,13.388,0,0,1,3.143-9.059,11.784,11.784,0,0,1,9.412-4.134,12.7,12.7,0,0,1,6.067,1.5,7.722,7.722,0,0,1,2.79,2.319,2.749,2.749,0,0,1,.555,1.546,2.027,2.027,0,0,1-.924,1.664,2.278,2.278,0,0,1-1.378.471,1.911,1.911,0,0,1-1.563-.756,6.985,6.985,0,0,0-5.647-2.74A6.618,6.618,0,0,0,7.69-13.134a11.141,11.141,0,0,0-1.361,5.7A10.817,10.817,0,0,0,7.775-1.672a6.255,6.255,0,0,0,5.58,3.261Q17.96,1.589,19.892-4.126ZM33.077-16.512H30.556a1.311,1.311,0,0,1-.941-.37,1.8,1.8,0,0,1-.538-1.378,1.671,1.671,0,0,1,.723-1.513,1.306,1.306,0,0,1,.756-.218h9.7a1.391,1.391,0,0,1,.975.37,1.8,1.8,0,0,1,.521,1.378,1.7,1.7,0,0,1-.723,1.513,1.336,1.336,0,0,1-.773.218h-2.5V1.656h2.5a1.391,1.391,0,0,1,.975.37A1.8,1.8,0,0,1,41.749,3.4a1.7,1.7,0,0,1-.723,1.513,1.336,1.336,0,0,1-.773.218h-9.7a1.311,1.311,0,0,1-.941-.37,1.765,1.765,0,0,1-.538-1.378A1.671,1.671,0,0,1,29.8,1.874a1.306,1.306,0,0,1,.756-.218h2.521ZM51.741-5.4V3.622A1.7,1.7,0,0,1,51.4,4.664a2.4,2.4,0,0,1-2.034.857,2.521,2.521,0,0,1-1.866-.672,1.664,1.664,0,0,1-.487-1.227V-16.445q0-3.546,3.546-3.546H63.69a1.462,1.462,0,0,1,1.076.437,2.1,2.1,0,0,1,.605,1.58,2,2,0,0,1-.874,1.832,1.5,1.5,0,0,1-.807.218H52.363a.55.55,0,0,0-.622.622v5.983H62.094a1.425,1.425,0,0,1,1.025.4,2.1,2.1,0,0,1,.605,1.58A1.866,1.866,0,0,1,62.867-5.6a1.419,1.419,0,0,1-.773.2Z" transform="translate(123.629 262.428)" fill="var(--publish-tool-button-color)"/>
            </g>
          </svg>
        </button>
      </div>

      <div class="publish-form-hash">
        <button class="publish-form-image-add-button" onclick={addHash}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--publish-tool-button-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-hash"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></svg>
        </button>
      </div>
    
  {/snippet}

  {#snippet bottom()}
    <div class="publish-form-bottom-publish" >
      <button class="publish-form__submit" disabled={isPublishEnabled} onclick={() => {dispatch('publish')}}>{$_('publish_button_send')}</button>
    </div>
  {/snippet}
</EditorBar>

{#if (isGiphyPickerOpen)}
  <GifPickerModal
    on:close={() => {isGiphyPickerOpen = false}}
    on:pickgiphy={handlePickGiphy}
    on:picktenor={handlePickTenor}
  ></GifPickerModal>
{/if}

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
    .editor-menu {
        list-style: none;

        &__button {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 30px;
            width: 30px;

            &[disabled] {
                svg {
                    stroke: var(--text-color-3);
                }
            }
        }
    }

    .publish-form-image-add-button {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 30px;
        width: 30px;

        &:disabled {
            opacity: .5;
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

    .publish-form-bottom-publish {
        margin-left: auto;
        display: none;
    }

    .editor-column {
        display: grid;
        grid-template-columns: 40px 1fr;
        gap: 8px;
        padding: 12px;
    }

    .publish-form-gif {
        svg {
            width: 24px;
            height: 24px;
        }
    }

    .publish-form-hash {
        @media (min-width: 768px) {
            display: none;
        }
    }
</style>