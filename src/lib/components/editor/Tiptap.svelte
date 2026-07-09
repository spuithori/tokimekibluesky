<script lang="ts">
    import CornerDownLeft from '@lucide/svelte/icons/corner-down-left';
  import {_} from 'tokimeki-i18n';
  import {onMount, onDestroy} from 'svelte'
  import {Editor} from '@tiptap/core'
  import Link from '@tiptap/extension-link';
  import Document from '@tiptap/extension-document';
  import Text from '@tiptap/extension-text';
  import Paragraph from '@tiptap/extension-paragraph';
  import HardBreak from '@tiptap/extension-hard-break';
  import Mention from '@tiptap/extension-mention';
  import {Emoji} from '$lib/components/editor/emoji';
  import { Placeholder, UndoRedo } from '@tiptap/extensions';
  import {TagDecorator} from "$lib/components/editor/hashtagDecorator";
  import {timelineHashtags, hashtagHistory} from "$lib/stores";
  import {fetchTrendingHashtags} from "$lib/hashtagApi";
  import MentionList from "$lib/components/editor/MentionList.svelte";
  import EditorBar from "$lib/components/editor/EditorBar.svelte";
  import {jsonToText} from "$lib/components/editor/richtext";
  import HashtagList from "$lib/components/editor/HashtagList.svelte";
  import {Hashtag} from "$lib/components/editor/hashtag";
  import {TAG_REGEX, MENTION_REGEX} from '$lib/atproto-richtext';
  import GifPickerModal from "$lib/components/publish/GifPickerModal.svelte";
  import {clipboardTextParser} from "$lib/components/editor/prosemirrorExtension";
  import Hash from '@lucide/svelte/icons/hash';
  import ImagePlus from '@lucide/svelte/icons/image-plus';
  import Laugh from '@lucide/svelte/icons/laugh';
  import LinkIcon from '@lucide/svelte/icons/link';
  import Unlink from '@lucide/svelte/icons/unlink';
  import SquareSplitVertical from '@lucide/svelte/icons/square-split-vertical';
  import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
  import Ellipsis from '@lucide/svelte/icons/ellipsis';
  import Menu from '$lib/components/ui/Menu.svelte';
  import { riceState } from '$lib/rice/riceState.svelte';

  const RING_CIRCUMFERENCE = 2 * Math.PI * 12;
  import Brush from '@lucide/svelte/icons/brush';
  import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
  import EmojiList from "$lib/components/editor/EmojiList.svelte";
  import KakuDrawModal from "$lib/components/editor/KakuDrawModal.svelte";

  interface Props {
    json: any;
    text?: string;
    _agent?: any;
    isEnabled: boolean;
    isVideoUploadEnabled: any;
    top?: import('svelte').Snippet;
    avatar?: import('svelte').Snippet;
    attachments?: import('svelte').Snippet;
    meta?: import('svelte').Snippet;
    onheightresize?: (event: PointerEvent) => void;
    onheightreset?: () => void;
    heightResizeActive?: boolean;
  }

  let {
    json = $bindable(),
    text = $bindable(''),
    _agent,
    isVideoUploadEnabled,
    top,
    avatar,
    attachments,
    meta,
    submitArea,
    onupload,
    onpickgif,
    onpublish,
    onthreadsplit,
    onpollclick,
    publishContentLength,
    isThreadSplitting = false,
    canPoll = false,
    hasPoll = false,
    onheightresize,
    onheightreset,
    heightResizeActive = false,
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
    let isMoreOpen = $state(false);
    const lengthRing = $derived(riceState.publish?.lengthRing === true);
    let isKakuDrawOpen = $state(false);
    let isFocus = $state(false);

    onMount(() => {
        editor = new Editor({
            element: element,
            editorProps: {
                clipboardTextParser: clipboardTextParser,
                handlePaste: (view, event) => {
                    const clipboardData = event.clipboardData;
                    let preventDefault = false;

                    if (clipboardData) {
                        if (clipboardData.types.includes('text/html')) {
                            const text = clipboardData.getData('text/plain');
                            view.pasteText(text);
                            preventDefault = true;
                        }

                        if (preventDefault) {
                            return true;
                        }
                    }
                },
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

                            const res = await _agent.xrpc.get('app.bsky.actor.searchActorsTypeahead', {term: query, limit: 6});
                            return res.actors.length ? res.actors : mentionsHistory;
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
                            const localTags = [...new Set([...$hashtagHistory, ...$timelineHashtags])];

                            if (!query) {
                                return localTags;
                            }

                            const normalizedQuery = query.toLowerCase();
                            const localMatches = localTags.filter(tag =>
                                tag.toLowerCase().startsWith(normalizedQuery)
                            );

                            try {
                                const apiMatches = await fetchTrendingHashtags(query, 6);
                                const merged = [...localMatches];
                                for (const tag of apiMatches) {
                                    if (!merged.some(t => t.toLowerCase() === tag.toLowerCase())) {
                                        merged.push(tag);
                                    }
                                }
                                return merged.slice(0, 8);
                            } catch {
                                return localMatches.slice(0, 8);
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
                Emoji.configure({
                    suggestion: {
                        items: ({editor, query}) => {
                            return editor.storage.emoji.emojis
                                .filter(({ shortcodes, tags }) => {
                                    return (
                                        shortcodes.find(shortcode => shortcode.startsWith(query.toLowerCase())) ||
                                        tags.find(tag => tag.startsWith(query.toLowerCase()))
                                    )
                                })
                                .slice(0, 8);
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
                })
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
                queueMicrotask(() => {
                    isFocus = true;
                });
            },
            onBlur() {
                queueMicrotask(() => {
                    isFocus = false;
                });
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

    export function focus(position = null, options = undefined) {
        editor.commands.focus(position, options);
    }

    export function blur() {
      editor.commands.blur();
    }

    export function setContent(content) {
       editor.commands.setContent(content, true);
    }

    function handlePickGif(gif) {
        isGiphyPickerOpen = false;

        onpickgif(gif);
    }

    function addHash() {
        editor.chain().focus().insertContent('#').run();
    }

    function handleEmojiPick(emoji) {
        editor.commands.insertContent(emoji.native);
    }
</script>

<div class="editor-scroll-area">
  {@render top?.()}

  <div class="editor-column">
    {@render avatar?.()}

    <div class="editor" bind:this={element}></div>
  </div>

  {@render attachments?.()}
</div>

{#if onheightresize}
  <div
    class="publish-height-bar"
    class:publish-height-bar--active={heightResizeActive}
    role="separator"
    aria-orientation="horizontal"
    aria-label={$_('publish_editor_height_resize')}
    onpointerdown={onheightresize}
    ondblclick={onheightreset}
  ></div>
{/if}

{#if meta}
  <div class="publish-meta">
    {@render meta()}
  </div>
{/if}

{#snippet gifIcon()}
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 64 64">
    <g transform="translate(-125 -223)">
      <rect width="64" height="64" transform="translate(125 223)" fill="none"/>
      <path d="M19.892-4.126H15.035a1.379,1.379,0,0,1-.992-.387,2,2,0,0,1-.588-1.529,1.748,1.748,0,0,1,.79-1.613,1.417,1.417,0,0,1,.79-.218h6.807A2.332,2.332,0,0,1,24.5-5.252V3.622A1.952,1.952,0,0,1,24.144,4.8a1.854,1.854,0,0,1-1.58.689q-1.95,0-1.95-1.832V1.387Q18.565,5.723,12.9,5.723A10.483,10.483,0,0,1,3.859,1.286,14.484,14.484,0,0,1,1.371-7.386a13.388,13.388,0,0,1,3.143-9.059,11.784,11.784,0,0,1,9.412-4.134,12.7,12.7,0,0,1,6.067,1.5,7.722,7.722,0,0,1,2.79,2.319,2.749,2.749,0,0,1,.555,1.546,2.027,2.027,0,0,1-.924,1.664,2.278,2.278,0,0,1-1.378.471,1.911,1.911,0,0,1-1.563-.756,6.985,6.985,0,0,0-5.647-2.74A6.618,6.618,0,0,0,7.69-13.134a11.141,11.141,0,0,0-1.361,5.7A10.817,10.817,0,0,0,7.775-1.672a6.255,6.255,0,0,0,5.58,3.261Q17.96,1.589,19.892-4.126ZM33.077-16.512H30.556a1.311,1.311,0,0,1-.941-.37,1.8,1.8,0,0,1-.538-1.378,1.671,1.671,0,0,1,.723-1.513,1.306,1.306,0,0,1,.756-.218h9.7a1.391,1.391,0,0,1,.975.37,1.8,1.8,0,0,1,.521,1.378,1.7,1.7,0,0,1-.723,1.513,1.336,1.336,0,0,1-.773.218h-2.5V1.656h2.5a1.391,1.391,0,0,1,.975.37A1.8,1.8,0,0,1,41.749,3.4a1.7,1.7,0,0,1-.723,1.513,1.336,1.336,0,0,1-.773.218h-9.7a1.311,1.311,0,0,1-.941-.37,1.765,1.765,0,0,1-.538-1.378A1.671,1.671,0,0,1,29.8,1.874a1.306,1.306,0,0,1,.756-.218h2.521ZM51.741-5.4V3.622A1.7,1.7,0,0,1,51.4,4.664a2.4,2.4,0,0,1-2.034.857,2.521,2.521,0,0,1-1.866-.672,1.664,1.664,0,0,1-.487-1.227V-16.445q0-3.546,3.546-3.546H63.69a1.462,1.462,0,0,1,1.076.437,2.1,2.1,0,0,1,.605,1.58,2,2,0,0,1-.874,1.832,1.5,1.5,0,0,1-.807.218H52.363a.55.55,0,0,0-.622.622v5.983H62.094a1.425,1.425,0,0,1,1.025.4,2.1,2.1,0,0,1,.605,1.58A1.866,1.866,0,0,1,62.867-5.6a1.419,1.419,0,0,1-.773.2Z" transform="translate(123.629 262.428)" fill="var(--publish-tool-button-color)"/>
    </g>
  </svg>
{/snippet}

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

      <button class="editor-menu-button" onclick={() => {onupload()}}>
        <ImagePlus size="20" color="var(--publish-tool-button-color)"></ImagePlus>
      </button>

      <button class="editor-menu-button publish-toolbar__collapsible" onclick={() => {isGiphyPickerOpen = true}} aria-label={$_('publish_tool_gif')}>
        {@render gifIcon()}
      </button>

      <button class="editor-menu-button only-mobile publish-toolbar__collapsible" onclick={addHash} aria-label={$_('publish_tool_hashtag')}>
        <Hash size="20" color="var(--publish-tool-button-color)"></Hash>
      </button>

      <Menu bind:isMenuOpen={isEmojiPickerOpen} buttonClassName="editor-menu-button" position="top-start">
        {#snippet ref()}
          <Laugh size="20" color="var(--publish-tool-button-color)"></Laugh>
        {/snippet}
        {#snippet content()}
          {#await import('$lib/components/publish/EmojiPicker.svelte') then { default: EmojiPicker }}
            <EmojiPicker bare onpick={handleEmojiPick}></EmojiPicker>
          {/await}
        {/snippet}
      </Menu>

      {#if canPoll}
        <button class="editor-menu-button publish-toolbar__collapsible" class:editor-menu-button--active={hasPoll} onclick={onpollclick} title={$_('poll_add')}>
          <BarChart3 size="20" color={hasPoll ? 'var(--primary-color)' : 'var(--publish-tool-button-color)'}></BarChart3>
        </button>
      {/if}

      <button class="editor-menu-button publish-toolbar__collapsible" onclick={() => {isKakuDrawOpen = true}} aria-label={$_('publish_tool_brush')}>
        <Brush size="20" color="var(--publish-tool-button-color)"></Brush>
      </button>

      <Menu bind:isMenuOpen={isMoreOpen} buttonClassName="editor-menu-button publish-toolbar__more" ariaLabel={$_('publish_more_tools')} position="top-end">
        {#snippet ref()}
          <Ellipsis size="20" color="var(--publish-tool-button-color)"></Ellipsis>
        {/snippet}
        {#snippet content()}
          <ul class="timeline-menu-list">
            <li class="timeline-menu-list__item">
              <button class="timeline-menu-list__button" onclick={() => { isMoreOpen = false; isGiphyPickerOpen = true; }}>
                {@render gifIcon()}
                <span>{$_('publish_tool_gif')}</span>
              </button>
            </li>
            <li class="timeline-menu-list__item">
              <button class="timeline-menu-list__button" onclick={() => { isMoreOpen = false; addHash(); }}>
                <Hash size="18" color="var(--publish-tool-button-color)"></Hash>
                <span>{$_('publish_tool_hashtag')}</span>
              </button>
            </li>
            {#if canPoll}
              <li class="timeline-menu-list__item">
                <button class="timeline-menu-list__button" class:timeline-menu-list__button--active={hasPoll} onclick={() => { isMoreOpen = false; onpollclick(); }}>
                  <BarChart3 size="18" color={hasPoll ? 'var(--primary-color)' : 'var(--publish-tool-button-color)'}></BarChart3>
                  <span>{$_('poll_add')}</span>
                </button>
              </li>
            {/if}
            <li class="timeline-menu-list__item">
              <button class="timeline-menu-list__button" onclick={() => { isMoreOpen = false; isKakuDrawOpen = true; }}>
                <Brush size="18" color="var(--publish-tool-button-color)"></Brush>
                <span>{$_('publish_tool_brush')}</span>
              </button>
            </li>
          </ul>
        {/snippet}
      </Menu>

      <div class="publish-length-wrap">
        {#if lengthRing}
          <div class="publish-length-ring" class:over={publishContentLength > 300} role="img" aria-label={String(300 - publishContentLength)}>
            <svg viewBox="0 0 28 28" width="28" height="28">
              <circle class="publish-length-ring__track" cx="14" cy="14" r="12"/>
              <circle
                class="publish-length-ring__bar"
                cx="14"
                cy="14"
                r="12"
                stroke-dasharray={RING_CIRCUMFERENCE}
                stroke-dashoffset={RING_CIRCUMFERENCE * (1 - Math.min(publishContentLength / 300, 1))}
              />
            </svg>

            {#if 300 - publishContentLength < 60}
              <span class="publish-length-ring__count">{300 - publishContentLength}</span>
            {/if}
          </div>
        {:else}
          <p class="publish-length" class:over={publishContentLength > 300}>{300 - publishContentLength}</p>
        {/if}

        {#if publishContentLength > 300 && onthreadsplit}
          <button class="thread-split-button" onclick={onthreadsplit} disabled={isThreadSplitting} aria-label={$_('thread_split')}>
            {$_('thread_split')}
            {#if isThreadSplitting}
              <LoadingSpinner size={16} padding={0} color="#fff"></LoadingSpinner>
            {:else}
              <SquareSplitVertical size="16"></SquareSplitVertical>
            {/if}
          </button>
        {/if}
      </div>
  {/snippet}
</EditorBar>

{#if (isGiphyPickerOpen)}
  <GifPickerModal
    onclose={() => {isGiphyPickerOpen = false}}
    onpickgif={handlePickGif}
  ></GifPickerModal>
{/if}

{#if (isKakuDrawOpen)}
  <KakuDrawModal
    {_agent}
    onclose={() => {isKakuDrawOpen = false}}
  ></KakuDrawModal>
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
      <CornerDownLeft size={20} color="var(--bg-color-1)" />
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
        padding: 12px;
    }

    .publish-height-bar {
        position: relative;
        height: 9px;
        margin: -4px 16px;
        z-index: 15;
        cursor: ns-resize;
        touch-action: none;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity .15s ease;

        &::after {
            content: '';
            height: 4px;
            width: 56px;
            max-width: 40%;
            border-radius: 4px;
            background: var(--primary-color);
            box-shadow: 0 0 0 1px var(--bg-color-1);
        }

        &:hover,
        &--active {
            opacity: 1;
        }

        @media (prefers-reduced-motion: reduce) {
            transition: none;
        }

        @media (max-width: 767px) {
            display: none;
        }
    }

    .publish-length-wrap {
        display: flex;
        align-items: center;
        gap: 5px;
        position: relative;
        margin-left: auto;
    }

    .publish-length-ring {
        position: relative;
        display: grid;
        place-items: center;

        svg {
            display: block;
            transform: rotate(-90deg);
        }

        circle {
            fill: none;
            stroke-width: 3;
        }

        .publish-length-ring__track {
            stroke: var(--border-color-2);
        }

        .publish-length-ring__bar {
            stroke: var(--primary-color);
            transition: stroke-dashoffset .15s ease;
        }

        .publish-length-ring__count {
            position: absolute;
            font-size: 10px;
            font-weight: bold;
            color: var(--publish-length-color);
        }

        &.over {
            .publish-length-ring__bar {
                stroke: var(--danger-color);
            }

            .publish-length-ring__count {
                color: var(--danger-color);
            }
        }
    }

    .publish-length {
        color: var(--publish-length-color);
        display: flex;
        align-items: center;
        white-space: nowrap;
        pointer-events: none;
        cursor: default;
        border-left: 1px solid var(--border-color-2);
        padding-left: 8px;

        @media (max-width: 767px) {
            margin-left: 0;
            border-left: none;
        }

        &.over {
            font-weight: bold;
            color: var(--danger-color);
        }
    }

    .thread-split-button {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        border-radius: var(--border-radius-2);
        border: 2px solid var(--primary-color);
        background-color: var(--bg-color-3);
        color: var(--primary-color);
        box-shadow: 0 0 10px var(--box-shadow-color-1);
        font-size: 12px;
        white-space: nowrap;
        font-weight: bold;
        transition: opacity .2s;
        letter-spacing: .05em;
        position: absolute;
        bottom: calc(100% + 8px);
        left: 50%;
        transform: translateX(-50%);

        &::before {
            content: '';
            position: absolute;
            left: 50%;
            top: calc(100% - 5px);
            width: 12px;
            height: 12px;
            background-color: var(--bg-color-3);
            border: 2px solid var(--primary-color);
            border-left: none;
            border-top: none;
            border-bottom-right-radius: 3px;
            transform: translateX(-50%) rotate(45deg);
        }

        &:hover:not(:disabled) {
            opacity: .8;
        }

        &:disabled {
            opacity: .6;
            cursor: not-allowed;
        }
    }
</style>