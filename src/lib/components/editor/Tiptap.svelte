<script lang="ts">
    import {_} from 'svelte-i18n';
    import {createEventDispatcher, onDestroy, onMount} from 'svelte'
    import {Editor} from '@tiptap/core'
    import Link from '@tiptap/extension-link';
    import Document from '@tiptap/extension-document';
    import Text from '@tiptap/extension-text';
    import Paragraph from '@tiptap/extension-paragraph';
    import HardBreak from '@tiptap/extension-hard-break';
    import Mention from '@tiptap/extension-mention';
    import Placeholder from '@tiptap/extension-placeholder';
    import History from  '@tiptap/extension-history';
    import {agent, sharedText, replyRef} from "$lib/stores";
    import MentionList from "$lib/components/editor/MentionList.svelte";
    import EditorBar from "$lib/components/editor/EditorBar.svelte";
    import {jsonToText} from "$lib/components/editor/richtext";
    const dispatch = createEventDispatcher();

    export let json;
    export let text = '';
    export let _agent = $agent;

    let element;
    let editor;
    let mentionList;

    let mentionsHistory = JSON.parse(localStorage.getItem('mentionsHistory')) || [];
    let mentionProps;
    let linkDialog;
    let linkValue = '';
    let linkButtonDisabled = true;

    $: addSharedText($sharedText);
    $: changePlaceholder($replyRef);

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
                Link.extend({ inclusive: false }).configure({
                    HTMLAttributes: {
                        class: 'editor-link',
                    },
                    autolink: true,
                    openOnClick: false,
                    linkOnPaste: false,
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

                            const res = await _agent.agent.api.app.bsky.actor.searchActorsTypeahead({term: query, limit: 4});
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
            editor.chain().insertContent(text).focus().run();
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
        dispatch('upload');
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
</script>

<div class="editor" bind:this={element}></div>

<slot></slot>

<EditorBar on:emojiPicked={(e) => {editor.commands.insertContent(e.detail.emoji)}}>
  <nav class="editor-menu-wrap">
    <ul class="editor-menu">
      {#if (editor)}
        {#if (editor.isActive('link'))}
          <li class="editor-menu__item">
            <button class="editor-menu__button" on:click={removeLink}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-unlink"><path d="m18.84 12.25 1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71"/><path d="m5.17 11.75-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71"/><line x1="8" x2="8" y1="2" y2="5"/><line x1="2" x2="5" y1="8" y2="8"/><line x1="16" x2="16" y1="19" y2="22"/><line x1="19" x2="22" y1="16" y2="16"/></svg>
            </button>
          </li>
        {:else}
          <li class="editor-menu__item">
            <button class="editor-menu__button" on:click={addLink} disabled={linkButtonDisabled}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-link"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            </button>
          </li>
        {/if}
      {/if}
    </ul>
  </nav>

  <div class="publish-form-image-add">
    <button class="publish-form-image-add-button" on:click={addImage}>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--publish-tool-button-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image-plus"><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/><line x1="16" x2="22" y1="5" y2="5"/><line x1="19" x2="19" y1="2" y2="8"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
    </button>
  </div>
</EditorBar>

{#if (mentionProps)}
  <MentionList props={mentionProps} bind:this={mentionList}></MentionList>
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
</style>