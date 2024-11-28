<script lang="ts">
  import { createBubbler, preventDefault } from 'svelte/legacy';

  const bubble = createBubbler();
  import {selfLabels} from "$lib/components/editor/publishStore";
  import {postgate, settings, threadGate} from "$lib/stores";
  import {_} from "svelte-i18n";
  import {isFeedByUri} from "$lib/util";
  import {formatDistanceToNow, parseISO} from "date-fns";
  import spinner from "$lib/images/loading.svg";
  import {
      AppBskyEmbedExternal,
      AppBskyEmbedImages,
      AppBskyEmbedRecord,
      AppBskyEmbedRecordWithMedia, RichText
  } from "@atproto/api";
  import Tiptap from "$lib/components/editor/Tiptap.svelte";
  import ThreadMembersList from "$lib/components/publish/ThreadMembersList.svelte";
  import AvatarAgentsSelector from "$lib/components/acp/AvatarAgentsSelector.svelte";
  import ImageUpload from "$lib/components/editor/ImageUpload.svelte";
  import FeedsItem from "$lib/components/feeds/FeedsItem.svelte";
  import ThreadGateLabel from "$lib/components/publish/ThreadGateLabel.svelte";
  import {X} from "lucide-svelte";
  import { toast } from "svelte-sonner";
  import imageCompression from "browser-image-compression";
  import {createEventDispatcher, onMount} from "svelte";
  import AltModal from "$lib/components/alt/AltModal.svelte";
  import {acceptedImageType} from "$lib/components/editor/imageUploadUtil";
  import {languageMap} from "$lib/langs/languageMap";
  import LangSelectorModal from "$lib/components/publish/LangSelectorModal.svelte";
  import PostGateLabel from "$lib/components/publish/PostGateLabel.svelte";
  import {getUploadLimit} from "$lib/components/editor/videoUtil";
  import {getTenorUrl} from "$lib/components/post/embedUtil";
  import EmbedTenor from "$lib/components/post/EmbedTenor.svelte";
  import ThreadGateModal from "$lib/components/publish/ThreadGateModal.svelte";
  import Menu from "$lib/components/ui/Menu.svelte";
  import {postState} from "$lib/classes/postState.svelte";
  const dispatch = createEventDispatcher();

  interface Props {
    post: any;
    _agent: any;
    length?: number;
    editor: any;
    isEnabled: any;
  }

  let {
    post = $bindable(),
    _agent = $bindable(),
    length = 0,
    editor = $bindable(),
    isEnabled = $bindable()
  }: Props = $props();
    let publishContent = $state('');
    let publishContentJson = $state();
    let isPublishEnabled = $state(false);
    let isProcessed = $state(false);
    let isAccountSelectDisabled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let links: string[] = $state([]);
    let externalImageBlob: string = $state('');
    let isPublishUploadClose = false;
    let isAltModalOpen = $state(false);
    let isLinkCardAdding = $state(false);
    let imageUploadEl = $state();
    let isDragover = $state(0);
    let isVirtualKeyboard = $state(false);
    let isLangSelectorOpen = $state(false);
    let isVideoUploadEnabled = $state(false);
    let isThreadGateOpen = $state(false);
    let isSelfLabelingMenuOpen = $state(false);

    const isMobile = navigator?.userAgentData?.mobile || false;

    if ('virtualKeyboard' in navigator) {
        navigator.virtualKeyboard.overlaysContent = true;
        isVirtualKeyboard = true;
    }

    type BeforeUploadImage = {
        image: Blob | File,
        alt: string,
        id: string,
    }
    let images = $state([]);
    let video = $state();

    let embed: AppBskyEmbedImages.Main | AppBskyEmbedRecord.Main | AppBskyEmbedRecordWithMedia.Main | AppBskyEmbedExternal.Main | undefined;
    let embedExternal: AppBskyEmbedExternal.Main | undefined = $state();
    let lang: string[] = [];

    if (!$settings.langSelector) {
        $settings.langSelector = 'auto';
    }

    let publishContentLength = $derived(new RichText({text: publishContent}).graphemeLength);
    let isEmpty = $derived(!publishContent && !images.length && !embedExternal);

    $effect(() => {
        onPublishContentChange(publishContent);
    })

    $effect(() => {
        isPublishEnabled = publishContentLength > 300;
    })

    $effect(() => {
        isThreaded(length, postState.reply);
    })

    $effect(() => {
        observeEnabled(isEmpty, isPublishEnabled, isProcessed, isLinkCardAdding);
    })

    function observeEnabled(isEmpty, isPublishEnabled, isProcessed, isLinkCardAdding) {
        isEnabled = isEmpty || isPublishEnabled || isProcessed || isLinkCardAdding;
    }

    function isThreaded(length, _replyRef) {
        if (!_replyRef) {
            return false;
        }

        if (length > 1) {
            toast.error($_('reply_disable_when_threaded'));
            postState.reply = undefined;
        }
    }

    function onPublishContentChange(text) {
        clearTimeout(timer);
        timer = setTimeout(async () => {
            detectRichText(text)
                .then(result => {
                    links = [];

                    if (result.facets) {
                        result.facets.forEach(facet => {
                            if (facet.features && facet.features[0]['$type'] === 'app.bsky.richtext.facet#link' && !links.includes(facet.features[0].uri)) {
                                links.push(facet.features[0].uri);
                                links = links;
                            }
                        })
                    }
                });
        }, 200);
    }

    async function addLinkCard(uri: string) {
        isLinkCardAdding = true;

        try {
            const lang = $settings.general?.userLanguage ? $settings.general?.userLanguage : 'en-US';
            const res = await fetch('https://tokimeki-api.vercel.app/api/ogp?url=' + encodeURIComponent(uri) + '&lang=' + lang);
            const data = await res.json();

            embedExternal = {
                $type: 'app.bsky.embed.external',
                external: {
                    uri: uri,
                    title: data.title || '',
                    description: data.description || '',
                }
            }

            if (data.imageBase64) {
                externalImageBlob = data.imageBase64;
            } else {
                externalImageBlob = '';
            }

            isLinkCardAdding = false;
        } catch (e) {
            toast.error('Error!' + e);
            isLinkCardAdding = false;
        }
    }

    async function addGiphyLinkCard(gif) {
        if (!gif) {
            return false;
        }

        try {
            isLinkCardAdding = true;

            const res = await fetch(gif.images.downsized.url);
            const blob = await res.blob();
            externalImageBlob = await imageCompression.getDataUrlFromFile(blob);

            embedExternal = {
                $type: 'app.bsky.embed.external',
                external: {
                    uri: gif.url,
                    title: gif.title || '',
                    description: 'Discover & share this Animated GIF with everyone you know. GIPHY is how you search, share, discover, and create GIFs.',
                }
            }

            isLinkCardAdding = false;
        } catch (e) {
            console.error(e);
            toast.error('Error!');
            isLinkCardAdding = false;
        }
    }

    async function addTenorLinkCard(gif) {
        if (!gif) {
            return false;
        }

        try {
            isLinkCardAdding = true;

            const res = await fetch(gif.url);
            const blob = await res.blob();
            externalImageBlob = await imageCompression.getDataUrlFromFile(blob);

            embedExternal = {
                $type: 'app.bsky.embed.external',
                external: {
                    uri: gif.url,
                    title: gif.title || '',
                    description: 'GIF by Tenor.',
                }
            }

            isLinkCardAdding = false;
        } catch (e) {
            console.error(e);
            toast.error('Error!');
            isLinkCardAdding = false;
        }
    }

    async function handleAgentSelect(agent) {
        _agent = agent;
        isVideoUploadEnabled = false;

        const limit = await getUploadLimit(_agent);
        if (limit?.canUpload) {
            isVideoUploadEnabled = true;
        }

        if ($threadGate !== 'everybody') {
            $threadGate = 'everybody';
            toast.success($_('thread_gate_reset_when_change_account'));
        }
    }

    async function detectRichText(text: string) {
        const rt = new RichText({text: text});
        await rt.detectFacets(_agent.agent);

        return rt;
    }

    function uploadContextOpen(e) {
        imageUploadEl.open(e?.detail?.isVideo);
    }

    async function handlePaste(e) {
        const itemsList = e.clipboardData.items;
        await uploadImageFromFileList(itemsList);
    }

    async function handleDrop(e) {
        isDragover = 0;
        const itemsList = e.dataTransfer.items;
        await uploadImageFromFileList(itemsList);
    }

    async function uploadImageFromFileList(itemsList: FileList) {
        isProcessed = true;
        const items = Array.from(itemsList).slice(0, 4);
        let promises = [];

        for (const item of items) {
            if (acceptedImageType.includes(item.type)) {
                promises = [...promises, imageUploadEl.applyImageFromFile(item.getAsFile())]
            }
        }

        if (promises.length) {
            images = [...images, ...await Promise.all(promises)];
        }

        isProcessed = false;
    }

    function handleDragover(e) {
        isDragover = isDragover + 1;
    }

    function handleDragleave(e) {
        isDragover = isDragover - 1;
    }

    function handleAltClose(_images: BeforeUploadImage[]) {
        images = _images;
        isAltModalOpen = false;
        editor.focus();
    }

    onMount(async () => {
        editor.clear();
        postState.quote = undefined;
        postState.reply = undefined;
        threadGate.set('everybody');
        selfLabels.set([]);
        images = [];
        video = undefined;
        links = [];
        editor.setContent(post.json || post.text);

        if (!post.images) {
            post.images = [];
        }

        if (post.images.length) {
            isPublishUploadClose = false;
            images = post.images;
        }

        if (post.video) {
            video = post.video;
        }

        if (post.quotePost) {
            postState.quote = post.quotePost;
        }

        if (post.replyRef) {
            if (post.replyRef.did) {
                postState.reply = post.replyRef;
            } else {
                postState.reply = {
                    did: _agent.did(),
                    data: post.replyRef,
                }
            }
        }

        if (post.embedExternal) {
            embedExternal = post.embedExternal;
        }

        if (post.lang) {
            $settings.langSelector = post.lang;
        }

        if (post.threadGate) {
            threadGate.set(post.threadGate);
        }

        if (post.selfLabels) {
            selfLabels.set(post.selfLabels);
        }

        externalImageBlob = post.externalImageBlob;

        /* const limit = await getUploadLimit(_agent);
        if (limit?.canUpload) {
            isVideoUploadEnabled = true;
        } */
    })

    function addThread() {
        if (!publishContent && !images.length && !embedExternal) {
            return false;
        }

        dispatch('add', {
            data: {
                text: publishContent,
                json: publishContentJson,
                quotePost: postState.quote || undefined,
                replyRef: postState.reply || undefined,
                images: images,
                video: video,
                owner: _agent.did() as string,
                embedExternal: embedExternal,
                selfLabels: $selfLabels || undefined,
                externalImageBlob: externalImageBlob || undefined,
                threadGate: $threadGate || undefined,
                lang: $settings.langSelector || [],
            }
        })
    }

    export function getThread() {
        return {
            text: publishContent,
            json: publishContentJson,
            quotePost: postState.quote || undefined,
            replyRef: postState.reply || undefined,
            images: images,
            video: video,
            owner: _agent.did() as string,
            embedExternal: embedExternal,
            selfLabels: $selfLabels || undefined,
            externalImageBlob: externalImageBlob || undefined,
            threadGate: $threadGate || undefined,
            lang: $settings.langSelector || [],
        }
    }

  const selfLabelsChoices = [
      {
          name: $_('labeling_sexual'),
          val: 'sexual',
      },
      {
          name: $_('labeling_nudity'),
          val: 'nudity',
      },
      {
          name: $_('labeling_porn'),
          val: 'porn',
      },
      {
          name: $_('labeling_graphic-media'),
          val: 'graphic-media',
      },
  ];

  function setSelfLabel(index) {
      $selfLabels = [
          {
              val: selfLabelsChoices[index].val,
          }
      ];
      isSelfLabelingMenuOpen = false;
  }

  function clearSelfLabels() {
      selfLabels.set([]);
      isSelfLabelingMenuOpen = false;
  }
</script>

<svelte:document onpaste={handlePaste} />

<div class="publish-form"
     class:publish-form--dragover={isDragover}
     class:publish-form--fit={isVirtualKeyboard && !$settings.design?.mobilePostLayoutTop}
     ondragover={preventDefault(bubble('dragover'))}
     ondrop={preventDefault(handleDrop)}
     ondragenter={preventDefault(handleDragover)}
     ondragleave={preventDefault(handleDragleave)}
>
  <Tiptap
          bind:text={publishContent}
          bind:json={publishContentJson}
          bind:this={editor}
          on:publish={() => {dispatch('publish')}}
          on:focus={() => {dispatch('focus')}}
          on:upload={uploadContextOpen}
          on:picktenor={(e) => addTenorLinkCard(e.detail.gif)}
          on:pickgiphy={(e) => addGiphyLinkCard(e.detail.gif)}
          {_agent}
          isPublishEnabled={isEmpty || isPublishEnabled}
          {isVideoUploadEnabled}
  >
    {#snippet top()}
      
        {#if (postState.reply && typeof postState.reply !== 'string')}
          <div class="publish-quote publish-quote--reply">
            <button class="publish-quote__delete" onclick={() => {postState.reply = undefined}}>
              <X color="#fff" size="18"></X>
            </button>

            <div class="timeline-external timeline-external--record timeline-external--record-publish">
              <div class="timeline-external__image timeline-external__image--round">
                {#if (postState.reply.data.parent.author.avatar)}
                  <img src="{postState.reply.data.parent.author.avatar}" alt="">
                {/if}
              </div>

              <div class="timeline-external__content">
                <div class="timeline__meta timeline__meta--member">
                  <p class="timeline__user">{postState.reply.data.parent.author.displayName || postState.reply.data.parent.author.handle}</p>

                  <ThreadMembersList uri={postState.reply.data.parent.uri} {_agent}></ThreadMembersList>
                </div>

                <p class="timeline-external__description">
                  {postState.reply.data.parent.record.text}
                </p>
              </div>

              <span class="timeline-external__icon">

              </span>
            </div>
          </div>
        {/if}
      
      {/snippet}

    {#snippet avatar()}
      <div class="publish-form-agents-selector">
        <AvatarAgentsSelector
                {_agent}
                isDisabled={isAccountSelectDisabled}
                onselect={handleAgentSelect}
                style={'publish'}
        ></AvatarAgentsSelector>

        {#if (!postState.reply)}
          <button class="add-thread-button" disabled={isEnabled} onclick={addThread} aria-label="{$_('post_add_thread')}"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-plus"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg></button>
        {/if}
      </div>
    {/snippet}

    {#snippet normal()}
        <div class="publish-upload">
        {#if (images.length)}
          <button class="publish-alt-text-button" onclick={() => {isAltModalOpen = true}}>
            <span class="ai-label">AI</span>
            {$_('add_alt_text')}
          </button>
        {/if}

        <ImageUpload
          bind:this={imageUploadEl}
          bind:images={images}
          bind:video={video}
          on:preparestart={() => {isPublishEnabled = true}}
          on:prepareend={() => {isPublishEnabled = false}}
        ></ImageUpload>

        {#if postState.quote?.uri}
          {#if (isFeedByUri(postState.quote.uri))}
            <div class="quote-feed-wrap">
              <button class="publish-quote__delete" onclick={() => {postState.quote = undefined}}>
                <X color="#fff" size="18"></X>
              </button>

              <FeedsItem {_agent} feed={postState.quote} layout="publish"></FeedsItem>
            </div>
          {:else}
            <div class="publish-quote">
              <button class="publish-quote__delete" onclick={() => {postState.quote = undefined}}>
                <X color="#fff" size="18"></X>
              </button>

              <div class="timeline-external timeline-external--record timeline-external--record-publish-quote">
                <div class="timeline-external__image timeline-external__image--round">
                  {#if (postState.quote.author.avatar)}
                    <img src="{postState.quote.author.avatar}" alt="">
                  {/if}
                </div>

                <div class="timeline-external__content">
                  <div class="timeline__meta">
                    <p class="timeline__user" title="{postState.quote.author.handle}">{ postState.quote.author.displayName || postState.quote.author.handle }</p>
                    <p class="timeline__date">{formatDistanceToNow(parseISO(postState.quote.record.createdAt))}</p>
                  </div>

                  <p class="timeline-external__description">
                    {postState.quote.record.text}
                  </p>
                </div>

                <span class="timeline-external__icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="28.705" height="25.467" viewBox="0 0 28.705 25.467">
                <path id="パス_3" data-name="パス 3" d="M-21.352-46.169H-9.525v6.82A26.369,26.369,0,0,1-16.777-20.7h-5.266A26.721,26.721,0,0,0-15.7-34.342h-5.655Zm16.273,0H6.662v6.82A26.079,26.079,0,0,1-.59-20.7H-5.77A25.477,25.477,0,0,0,.489-34.342H-5.079Z" transform="translate(22.043 46.169)" fill="var(--primary-color)"/>
              </svg>
              </span>
              </div>
            </div>
          {/if}
        {/if}

        {#if (embedExternal && !images.length)}
          <div class="publish-quote publish-quote--external">
            <button class="publish-quote__delete" onclick={() => {embedExternal = undefined; externalImageBlob = ''}}>
              <X color="#fff" size="18"></X>
            </button>

            {#if getTenorUrl(embedExternal.external.uri) && $settings?.embed?.tenor}
              <div class="publish-tenor-external" class:publish-tenor-external--bottom={$settings.design?.publishPosition === 'bottom'}>
                <EmbedTenor tenor={getTenorUrl(embedExternal.external.uri)}></EmbedTenor>
              </div>
            {:else}
              <div class="timeline-external timeline-external--record">
                <div class="timeline-external__image">
                  {#if (externalImageBlob)}
                    <img src="{externalImageBlob}" alt="">
                  {/if}
                </div>

                <div class="timeline-external__content">
                  <p class="timeline-external__title"><a href="{embedExternal.external.uri}" target="_blank" rel="noopener nofollow noreferrer">{embedExternal.external.title}</a></p>
                  <p class="timeline-external__description">{embedExternal.external.description}</p>
                  <p class="timeline-external__url">{embedExternal.external.uri}</p>
                </div>
              </div>
            {/if}
          </div>
        {/if}

        {#if (!embedExternal && links.length && !images.length)}
          <div class="link-card-registerer">
            {#each links as link}
              <button
                disabled={isLinkCardAdding}
                class="link-card-registerer-button"
                onclick={() => {addLinkCard(link)}}
              >
                {#if (isLinkCardAdding)}
                  <img class="loading-spinner" src={spinner} alt="">
                {/if}
                {$_('link_card_embed')}: {link}
              </button>
            {/each}
          </div>
        {/if}

        {#if ($threadGate !== 'everybody' && !postState.reply)}
          <ThreadGateLabel></ThreadGateLabel>
        {/if}

        {#if !$postgate}
          <PostGateLabel></PostGateLabel>
        {/if}
      </div>
    {/snippet}
  </Tiptap>

  {#if ($selfLabels.length)}
    <div class="self-labeling-note">
      <p class="self-labeling-note__text">{$_('self_labeling_note')}</p>
    </div>
  {/if}

  <div class="publish-bb-nav">
    <button class="publish-form-lang-selector-button" onclick={() => {isLangSelectorOpen = !isLangSelectorOpen}}>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--publish-tool-button-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-globe"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
      {#if ($settings.langSelector !== 'auto' && Array.isArray($settings.langSelector))}
        {#each $settings.langSelector as lang}
          <span>{$_(languageMap.get(lang)?.name)}</span>
        {/each}
      {/if}
    </button>

    <p class="publish-length">
      <span class="publish-length__current" class:over={publishContentLength > 300}>{300 - publishContentLength}</span>
    </p>

    <div class="publish-form-moderation">
      <Menu bind:isMenuOpen={isSelfLabelingMenuOpen} buttonClassName="publish-form-moderation-button">
        {#snippet ref()}
          <svg class:stroke-danger={$selfLabels.length}  xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--publish-tool-button-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
        {/snippet}

        {#snippet content()}
          <ul  class="timeline-menu-list">
            {#each selfLabelsChoices as choice, index}
              <li class="timeline-menu-list__item">
                <button class="timeline-menu-list__button" class:timeline-menu-list__button--active={$selfLabels.some(label => label.val === choice.val)} onclick={() => setSelfLabel(index)}>{choice.name}</button>
              </li>
            {/each}

            {#if ($selfLabels.length)}
              <li class="timeline-menu-list__item">
                <button class="timeline-menu-list__button text-danger" onclick={clearSelfLabels}>{$_('selflabels_remove')}</button>
              </li>
            {/if}
          </ul>
        {/snippet}
      </Menu>
    </div>

    {#if (!postState.reply)}
      <div class="publish-form-thread-gate">
        <button class="publish-form-lang-selector-button" onclick={() => {isThreadGateOpen = !isThreadGateOpen}}>
          <svg class:stroke-danger={$threadGate !== 'everybody'} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--publish-tool-button-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-square-warning"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M12 7v2"/><path d="M12 13h.01"/></svg>
        </button>
      </div>
    {/if}
  </div>
</div>

{#if (isLangSelectorOpen)}
  <LangSelectorModal on:close={() => {isLangSelectorOpen = false}}></LangSelectorModal>
{/if}

{#if (isAltModalOpen)}
  <AltModal images={images} close={handleAltClose}></AltModal>
{/if}

{#if (isThreadGateOpen)}
  <ThreadGateModal on:close={() => {isThreadGateOpen = false}} {_agent}></ThreadGateModal>
{/if}

<style lang="postcss">
    .publish-form-lang-selector-button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        color: var(--text-color-1);
        padding: 0 5px;
        font-size: 14px;
        height: 30px;
        max-width: 140px;
        white-space: nowrap;

        svg {
            flex-shrink: 0;
        }

        span {
            text-overflow: ellipsis;
            overflow: hidden;
        }
    }

  .add-thread-button {
      height: 40px;
      width: 40px;
      color: var(--text-color-2);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 24px;
      position: relative;

      &::before {
          content: '';
          display: block;
          position: absolute;
          left: 0;
          right: 0;
          margin: auto;
          height: 24px;
          width: 2px;
          background-color: currentColor;
          bottom: calc(100% - 4px);
      }
      
      &:disabled {
          cursor: not-allowed;
          color: var(--border-color-1);
      }
  }

  .ai-label {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      background-color: rgba(0, 0, 0, .2);
      color: var(--bg-color-1);
      letter-spacing: .1em;
      font-weight: bold;
      font-size: 12px;
      line-height: 1.05;
      height: 20px;
      border-radius: 10px;
      padding: 0 8px 0 10px;
      margin-right: 2px;
  }

  .quote-feed-wrap {
      position: relative;
  }

  .self-labeling-note {
      padding: 12px;
      border-top: 1px solid var(--border-color-2);
      font-size: 14px;
      color: var(--text-color-3);
  }

  .publish-alt-text-button {
      background-color: var(--primary-color);
      color: var(--bg-color-1);
      border-radius: 4px;
      font-size: 14px;
      width: 100%;
      height: 30px;
      z-index: 10;
      font-weight: bold;
      transition: opacity .2s ease-in-out, transform .05s ease-in-out;
      margin-bottom: 8px;

      &:hover {
          opacity: .8;
      }

      &:active {
          transform: scale(.99);
      }

      @media (max-width: 767px) {
          position: relative;
          top: auto;
          left: auto;
          width: 100%;
      }
  }

  .link-card-registerer {
      display: flex;
      flex-direction: column;
  }

  .link-card-registerer-button {
      border: 1px solid var(--border-color-1);
      padding: 6px 26px 6px 10px;
      font-size: 14px;
      border-radius: 6px;
      margin-bottom: 10px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
      position: relative;
      z-index: 11;
      text-align: left;
      color: var(--text-color-1);
      background-color: var(--bg-color-1);

      &:disabled {
          color: var(--text-color-3);
      }

      .loading-spinner {
          width: 16px;
          height: 16px;
          position: absolute;
          right: 10px;
          top: 0;
          bottom: 0;
          margin: auto;
      }
  }

  .publish-upload {
      padding: 0 8px;
      background-color: var(--publish-textarea-bg-color);
  }

  .publish-quote {
      position: relative;

      &--reply {
          margin: 12px 12px 0;

          .publish-quote__delete {
              top: 0;
              right: 0;
          }
      }

      .timeline__date {
          &::after {
              content: none;
          }
      }

      &__delete {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background-color: rgba(0, 0, 0, .5);
          display: grid;
          place-content: center;
          position: absolute;
          right: 8px;
          top: 8px;
          z-index: 12;
      }
  }

  .publish-length {
      color: var(--publish-length-color);
      display: flex;
      align-items: center;
      margin-right: auto;
      white-space: nowrap;

      &__current {
          &.over {
              font-weight: bold;
              color: var(--danger-color);
          }
      }
  }

  .publish-bb-nav {
      border-top: 1px solid var(--border-color-2);
      height: 40px;
      width: 100%;
      padding: 0 16px;
      display: flex;
      align-items: center;
      gap: 4px;
  }

  .publish-form {
      &--fit {
          @media (max-width: 767px) {
              .publish-length {
                  margin-left: auto;
                  margin-right: 0;
              }

              .add-thread-button {
                  order: 1;
              }

              .publish-form-lang-selector-button {
                 order: 2;
              }

              .publish-bb-nav {
                  padding-left: 12px;
                  gap: 8px;
              }
          }
      }
  }

  .publish-form-lang-selector-button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      color: var(--text-color-1);
      padding: 0 5px;
      font-size: 14px;
      height: 30px;
  }

  .publish-form-moderation {
      position: relative;
  }
</style>