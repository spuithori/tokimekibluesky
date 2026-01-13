<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { ImageEditor } from 'tokimeki-image-editor';
    import { toast } from 'svelte-sonner';
    import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
    import Modal from '$lib/components/ui/Modal.svelte';

    interface Props {
        _agent: any;
        onclose: () => void;
        onsuccess?: (postUri: string) => void;
    }

    let { _agent, onclose, onsuccess }: Props = $props();

    const KAKU_API_BASE = 'https://kaku.tokimeki.tech';

    interface Background {
        id: string;
        name: string;
        path: string;
    }

    const backgrounds: Background[] = [
        { id: 'default', name: 'Default', path: '/oekaki.png' },
        { id: 'kokuban', name: 'Blackboard', path: '/oekaki-kokuban.png' },
        { id: 'paper', name: 'Paper', path: '/oekaki-paper.png' }
    ];

    let showDetails = $state(false);
    let imageData = $state<{ blob: Blob; width: number; height: number } | null>(null);
    let imagePreview = $state<string>('');
    let text = $state('');
    let tags = $state<string[]>([]);
    let tagInput = $state('');
    let shareToBluesky = $state(true);
    let isPosting = $state(false);
    let selectedBackground = $state(backgrounds[0]);
    let showBackgroundPicker = $state(false);
    let editorKey = $state(0);

    function handleAddTag() {
        const tag = tagInput.trim().replace(/^#/, '');
        if (tag && !tags.includes(tag) && tags.length < 8) {
            tags = [...tags, tag];
            tagInput = '';
        }
    }

    function handleTagKeydown(event: KeyboardEvent) {
        if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            handleAddTag();
        }
    }

    function removeTag(tag: string) {
        tags = tags.filter(t => t !== tag);
    }

    function handleDrawComplete(dataUrl: string, blobObj: { blob: Blob; width: number; height: number }) {
        imageData = blobObj;
        imagePreview = dataUrl;
        showDetails = true;
    }

    function handleDrawCancel() {
        onclose();
    }

    function handleDetailsClose() {
        showDetails = false;
    }

    function handleBackgroundSelect(bg: Background) {
        selectedBackground = bg;
        showBackgroundPicker = false;
        editorKey++;
    }

    async function handlePost() {
        if (!imageData || !_agent) return;

        isPosting = true;

        try {
            const blobResponse = await _agent.agent.api.com.atproto.repo.uploadBlob(
                new Uint8Array(await imageData.blob.arrayBuffer()),
                { encoding: imageData.blob.type }
            );

            const blob = blobResponse.data.blob;
            const now = new Date();
            const rkey = generateTID();
            const record: Record<string, unknown> = {
                $type: 'tech.tokimeki.kaku.post',
                image: blob,
                aspectRatio: {
                    width: imageData.width,
                    height: imageData.height
                },
                createdAt: now.toISOString()
            };

            if (text.trim()) {
                record.text = text.trim();
            }

            if (tags.length > 0) {
                record.tags = tags;
            }

            const createResponse = await _agent.agent.api.com.atproto.repo.createRecord({
                repo: _agent.did(),
                collection: 'tech.tokimeki.kaku.post',
                rkey,
                record
            });

            const postUri = createResponse.data.uri;

            if (shareToBluesky) {
                try {
                    const userText = text.trim() || '';
                    const linkText = $_('kaku_view_on_kaku');
                    const postUrl = `${KAKU_API_BASE}/post/${_agent.did()}/${rkey}`;
                    const fullText = userText ? `${userText}\n\n${linkText}` : linkText;

                    const bskyRecord: Record<string, unknown> = {
                        $type: 'app.bsky.feed.post',
                        text: fullText,
                        embed: {
                            $type: 'app.bsky.embed.images',
                            images: [
                                {
                                    image: blob,
                                    alt: text.trim() || 'Drawing',
                                    aspectRatio: {
                                        width: imageData.width,
                                        height: imageData.height
                                    }
                                }
                            ]
                        },
                        createdAt: now.toISOString(),
                        via: 'TOKIMEKI',
                        tags: ['カクトキメキ']
                    };

                    const textEncoder = new TextEncoder();
                    const textBeforeLink = userText ? `${userText}\n\n` : '';
                    const linkByteStart = textEncoder.encode(textBeforeLink).length;
                    const linkByteEnd = linkByteStart + textEncoder.encode(linkText).length;

                    bskyRecord.facets = [
                        {
                            index: {
                                byteStart: linkByteStart,
                                byteEnd: linkByteEnd
                            },
                            features: [
                                {
                                    $type: 'app.bsky.richtext.facet#link',
                                    uri: postUrl
                                }
                            ]
                        }
                    ];

                    const bskyResponse = await _agent.agent.api.com.atproto.repo.createRecord({
                        repo: _agent.did(),
                        collection: 'app.bsky.feed.post',
                        record: bskyRecord
                    });

                    await _agent.agent.api.com.atproto.repo.putRecord({
                        repo: _agent.did(),
                        collection: 'tech.tokimeki.kaku.post',
                        rkey,
                        record: {
                            ...record,
                            linkedPost: {
                                uri: bskyResponse.data.uri,
                                cid: bskyResponse.data.cid
                            }
                        }
                    });
                } catch (e) {
                    console.error('Failed to share to Bluesky:', e);
                }
            }

            toast.success($_('kaku_post_success'));
            onsuccess?.(postUri);
            onclose();
        } catch (e) {
            console.error('Failed to create KAKU post:', e);
            toast.error($_('kaku_post_error'));
        } finally {
            isPosting = false;
        }
    }

    function generateTID(): string {
        const now = Date.now();
        const clockId = Math.floor(Math.random() * 1024);
        const tid = (BigInt(now) * BigInt(1024) + BigInt(clockId)).toString(32);
        return tid.padStart(13, '2');
    }
</script>

<div class="kaku-draw-overlay">
    <div class="editor-container">
        {#key editorKey}
            <ImageEditor
                onComplete={handleDrawComplete}
                onCancel={handleDrawCancel}
                initialImage={selectedBackground.path}
                initialMode="annotate"
                initialTool="pen"
                initialStrokeWidth={20}
            />
        {/key}

        <button
            class="background-toggle-button"
            onclick={() => showBackgroundPicker = !showBackgroundPicker}
            title={$_('kaku_change_background')}
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
        </button>

        {#if showBackgroundPicker}
            <div class="background-picker-panel">
                <div class="background-picker-header">
                    <span>{$_('kaku_select_background')}</span>
                    <button class="close-picker" onclick={() => showBackgroundPicker = false}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="background-picker">
                    {#each backgrounds as bg (bg.id)}
                        <button
                            class="background-option"
                            class:selected={selectedBackground.id === bg.id}
                            onclick={() => handleBackgroundSelect(bg)}
                            title={bg.name}
                        >
                            <img src={bg.path} alt={bg.name} />
                            {#if selectedBackground.id === bg.id}
                                <div class="check-mark">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                </div>
                            {/if}
                        </button>
                    {/each}
                </div>
            </div>
        {/if}

        {#if isPosting}
            <div class="submitting-overlay">
                <LoadingSpinner size={40} padding={0} color="#fff"></LoadingSpinner>
            </div>
        {/if}
    </div>
</div>

{#if showDetails}
    <Modal title={$_('kaku_draw_title')} size="small" onclose={handleDetailsClose}>
        <div class="kaku-details-content">
            <p class="kaku-notice">{$_('kaku_notice')}</p>

            <div class="image-preview">
                <img src={imagePreview} alt="Preview" />
            </div>

            <div class="details-form">
                <div class="input-group">
                    <label for="kaku-text">{$_('kaku_description_label')}</label>
                    <textarea
                        id="kaku-text"
                        bind:value={text}
                        placeholder={$_('kaku_text_placeholder')}
                        maxlength="300"
                        rows="3"
                    ></textarea>
                </div>

                <div class="input-group">
                    <label for="kaku-tags">{$_('kaku_tags_label')}</label>
                    <div class="tags-input">
                        {#each tags as tag}
                            <span class="tag">
                                #{tag}
                                <button type="button" onclick={() => removeTag(tag)}>&times;</button>
                            </span>
                        {/each}
                        {#if tags.length < 8}
                            <input
                                id="kaku-tags"
                                type="text"
                                bind:value={tagInput}
                                onkeydown={handleTagKeydown}
                                onblur={handleAddTag}
                                placeholder={tags.length === 0 ? $_('kaku_tags_placeholder') : ''}
                            />
                        {/if}
                    </div>
                </div>

                <label class="checkbox-label">
                    <span class="checkbox-box" class:checked={shareToBluesky}>
                        <input type="checkbox" bind:checked={shareToBluesky} />
                        {#if shareToBluesky}
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        {/if}
                    </span>
                    <span>{$_('kaku_share_to_bluesky')}</span>
                </label>

                <button class="post-button" onclick={handlePost} disabled={isPosting}>
                    {#if isPosting}
                        <LoadingSpinner size={16} padding={0} color="#fff"></LoadingSpinner>
                    {:else}
                        {$_('publish_button_send')}
                    {/if}
                </button>
            </div>
        </div>
    </Modal>
{/if}

<style lang="postcss">
    .kaku-draw-overlay {
        position: fixed;
        inset: 0;
        z-index: 1000;
        background-color: #1a1a1a;
    }

    .editor-container {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
    }

    .editor-container :global(.image-editor) {
        width: 100% !important;
        height: 100% !important;
        max-height: 100%;
        box-sizing: border-box;
    }

    .editor-container :global(.editor-body) {
        flex: 1;
        min-height: 0;
    }

    .editor-container :global(.canvas-container) {
        flex: 1;
        min-height: 0;
    }

    .background-toggle-button {
        position: absolute;
        top: 78px;
        left: 28px;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.9);
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #374151;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        transition: all 0.2s;
        z-index: 10;

        &:hover {
            background: white;
            transform: scale(1.05);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
    }

    .background-picker-panel {
        position: absolute;
        top: 60px;
        left: 12px;
        background: var(--bg-color-1, #fff);
        border-radius: 12px;
        padding: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
        z-index: 20;
        min-width: 220px;
    }

    .background-picker-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--border-color-1, #e5e7eb);

        span {
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--text-color-1, #1f2937);
        }
    }

    .close-picker {
        background: none;
        border: none;
        padding: 4px;
        cursor: pointer;
        color: var(--text-color-3, #6b7280);
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;

        &:hover {
            background: var(--bg-color-3, #f3f4f6);
            color: var(--text-color-1, #1f2937);
        }
    }

    .background-picker {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
    }

    .background-option {
        position: relative;
        width: 60px;
        height: 45px;
        padding: 0;
        border: 2px solid var(--border-color-1);
        border-radius: 8px;
        overflow: hidden;
        cursor: pointer;
        background: var(--bg-color-2);
        transition: all 0.2s;

        &:hover {
            border-color: var(--primary-color);
            transform: scale(1.05);
        }

        &.selected {
            border-color: var(--primary-color);
            box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
        }

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
    }

    .check-mark {
        position: absolute;
        top: 2px;
        right: 2px;
        width: 18px;
        height: 18px;
        background: var(--primary-color);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
    }

    .submitting-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        z-index: 100;

        span {
            color: white;
            font-size: 1rem;
            font-weight: 500;
        }
    }

    .kaku-details-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .kaku-notice {
        font-size: 0.8rem;
        color: var(--text-color-3);
        background-color: var(--bg-color-2);
        padding: 12px;
        border-radius: 8px;
        margin: 0;
        line-height: 1.5;
    }

    .image-preview {
        border-radius: 12px;
        overflow: hidden;
        background-color: var(--bg-color-2);

        img {
            width: 100%;
            height: auto;
            max-height: 300px;
            object-fit: contain;
            display: block;
        }
    }

    .details-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .input-group {
        display: flex;
        flex-direction: column;
        gap: 8px;

        label {
            font-size: 0.875rem;
            color: var(--text-color-3);
        }

        textarea {
            width: 100%;
            padding: 12px;
            border: 1px solid var(--border-color-1);
            border-radius: 8px;
            background-color: var(--bg-color-2);
            color: var(--text-color-1);
            font-size: 14px;
            resize: none;
            font-family: inherit;
            box-sizing: border-box;

            &::placeholder {
                color: var(--text-color-3);
            }

            &:focus {
                outline: none;
                border-color: var(--primary-color);
            }
        }
    }

    .tags-input {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        padding: 0 12px;
        background: var(--bg-color-2);
        border: 1px solid var(--border-color-1);
        border-radius: 8px;
        min-height: 42px;
        align-items: center;

        &:focus-within {
            border-color: var(--primary-color);
        }

        input {
            flex: 1;
            min-width: 100px;
            border: none;
            background: none;
            color: var(--text-color-1);
            font-size: 0.875rem;
            padding: 4px 0;

            &:focus {
                outline: none;
            }

            &::placeholder {
                color: var(--text-color-3);
            }
        }
    }

    .tag {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        background: var(--primary-color);
        color: white;
        border-radius: 9999px;
        font-size: 0.75rem;

        button {
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            padding: 0;
            font-size: 1rem;
            line-height: 1;
            opacity: 0.8;

            &:hover {
                opacity: 1;
            }
        }
    }

    .checkbox-label {
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        font-size: 14px;
        color: var(--text-color-1);
        padding: 8px 0;
        user-select: none;
    }

    .checkbox-box {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border: 2px solid var(--border-color-1);
        border-radius: 4px;
        background-color: var(--bg-color-2);
        flex-shrink: 0;
        transition: all 0.15s ease;
    }

    .checkbox-box.checked {
        background-color: var(--primary-color);
        border-color: var(--primary-color);
        color: white;
    }

    .checkbox-box input[type="checkbox"] {
        position: absolute;
        opacity: 0;
        width: 100%;
        height: 100%;
        margin: 0;
        cursor: pointer;
    }

    .checkbox-box svg {
        pointer-events: none;
    }

    .checkbox-label:hover .checkbox-box {
        border-color: var(--primary-color);
    }

    .post-button {
        width: 100%;
        padding: 12px 24px;
        border: none;
        background-color: var(--primary-color);
        color: white;
        border-radius: 9999px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin-top: 8px;

        &:hover:not(:disabled) {
            filter: brightness(1.1);
        }

        &:disabled {
            opacity: 0.7;
            cursor: not-allowed;
        }
    }
</style>
