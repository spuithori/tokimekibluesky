<script lang="ts">
  import {settings} from "$lib/stores";
  import {_} from "svelte-i18n";
  import {isFeedByUri} from "$lib/util";
  import { AppBskyEmbedExternal, AppBskyEmbedImages, AppBskyEmbedRecord, AppBskyEmbedRecordWithMedia, RichText } from "@atproto/api";
  import Tiptap from "$lib/components/editor/Tiptap.svelte";
  import ThreadMembersList from "$lib/components/publish/ThreadMembersList.svelte";
  import AvatarAgentsSelector from "$lib/components/acp/AvatarAgentsSelector.svelte";
  import ImageUpload from "$lib/components/editor/ImageUpload.svelte";
  import FeedsItem from "$lib/components/feeds/FeedsItem.svelte";
  import ThreadGateLabel from "$lib/components/publish/ThreadGateLabel.svelte";
  import {CirclePlus, Globe, X} from "lucide-svelte";
  import { toast } from "svelte-sonner";
  import imageCompression from "browser-image-compression";
  import {onMount} from "svelte";
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
  import {getPostState} from "$lib/classes/postState.svelte";
  import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
  import EmbedRecord from "$lib/components/post/EmbedRecord.svelte";
  import {useDebounce, watch} from "runed";
  import Notice from "$lib/components/ui/Notice.svelte";
  import SelfLabelLabel from "$lib/components/publish/SelfLabelLabel.svelte";

  interface Props {
    index: number;
    _agent: any;
    editor: any;
    isEnabled: any;
  }

  let {
    index,
    _agent = $bindable(),
    editor = $bindable(),
    isEnabled = $bindable(),
    onadd,
    onopen,
    onpublish,
    submitArea,
  }: Props = $props();

    const postState = getPostState();
    const post = postState.getPost(index);

    let publishContentLength = $derived(new RichText({text: post.text}).graphemeLength);
    let isEmpty = $derived(!post.text && !post.images.length && !post.embedExternal);
    let isPublishEnabled = $derived(publishContentLength > 300);
    let isProcessed = $state(false);
    let isAccountSelectDisabled = false;
    let links: string[] = $state([]);
    let isAltModalOpen = $state(false);
    let isLinkCardAdding = $state(false);
    let imageUploadEl = $state();
    let isDragover = $state(0);
    let isLangSelectorOpen = $state(false);
    let isVideoUploadEnabled = $state(false);
    let isThreadGateOpen = $state(false);
    let isSelfLabelingMenuOpen = $state(false);
    let altFocusPulse = $state();

    let isAltTextRequired = $derived.by(() => {
      if (!$settings?.general?.requireInputAltText) {
        return false;
      }

      if (postState.posts.some(post => post.images.some(image => !image.alt))) {
        return true;
      }

      return false;
    });

    const linkDebounce = useDebounce(
      () => {
        detectRichText(post.text)
          .then(result => {
            links = [];

            if (result.facets) {
              result.facets.forEach(facet => {
                if (facet.features && facet.features[0]['$type'] === 'app.bsky.richtext.facet#link' && !links.includes(facet.features[0].uri)) {
                  links.push(facet.features[0].uri);
                }
              })
            }
          });
      },
      200
    );
    watch(() => post.text, linkDebounce);

    watch(() => postState.pulse, () => {
      if (postState.pulse) {
        if (!editor) {
          return false;
        }

        onopen();
        editor.setContent(post.text);
        postState.pulse = false;
      }
    });

    type BeforeUploadImage = {
        image: Blob | File,
        alt: string,
        id: string,
    }

    let embed: AppBskyEmbedImages.Main | AppBskyEmbedRecord.Main | AppBskyEmbedRecordWithMedia.Main | AppBskyEmbedExternal.Main | undefined;

    $effect(() => {
        isEnabled = isEmpty || isPublishEnabled || isProcessed || isLinkCardAdding || isAltTextRequired;
    });

    if (!post.selfLabels) {
      post.selfLabels = [];
    }

    async function addLinkCard(uri: string) {
        isLinkCardAdding = true;

        try {
            const lang = $settings.general?.userLanguage ? $settings.general?.userLanguage : 'en-US';
            const res = await fetch('https://tokimeki-api.vercel.app/api/ogp?url=' + encodeURIComponent(uri) + '&lang=' + lang);
            const data = await res.json();

            post.embedExternal = {
                $type: 'app.bsky.embed.external',
                external: {
                    uri: uri,
                    title: data.title || '',
                    description: data.description || '',
                }
            }

            if (data.imageBase64) {
                post.externalImageBlob = data.imageBase64;
            } else {
                post.externalImageBlob = '';
            }

            isLinkCardAdding = false;
        } catch (e) {
            toast.error('Error!' + e);
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
            post.externalImageBlob = await imageCompression.getDataUrlFromFile(blob);
            post.embedExternal = {
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
        post.owner = _agent.did();
        isVideoUploadEnabled = false;

        const limit = await getUploadLimit(_agent);
        if (limit?.canUpload) {
            isVideoUploadEnabled = true;
        }

        if (post.threadGate !== 'everybody') {
            // post.threadGate = 'everybody';
            // toast.success($_('thread_gate_reset_when_change_account'));
        }
    }

    async function detectRichText(text: string) {
        const rt = new RichText({text: text});
        await rt.detectFacets(_agent.agent);

        return rt;
    }

    function uploadContextOpen(isVideo: boolean) {
        imageUploadEl.open(isVideo);
    }

    async function handlePaste(e) {
        const itemsList = e.clipboardData.items;
        await uploadImageFromFileList(itemsList);
    }

    async function handleDrop(e) {
        e.preventDefault();
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
          post.images = [...post.images, ...await Promise.all(promises)];
        }

        isProcessed = false;
    }

    function handleDragover(e) {
        e.preventDefault();
        isDragover = isDragover + 1;
    }

    function handleDragleave(e) {
        e.preventDefault();
        isDragover = isDragover - 1;
    }

    function handleAltClose(images: BeforeUploadImage[]) {
        post.images = images;
        isAltModalOpen = false;
        editor.focus();
    }

    onMount(() => {
        links = [];
        editor.setContent(post.json || post.text);
        post.owner = _agent.did();
    })

    function addThread() {
        if (!post.text && !post.images.length && !post.embedExternal) {
            return false;
        }

        onadd(post);
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
      post.selfLabels = [
          {
              val: selfLabelsChoices[index].val,
          }
      ];
      isSelfLabelingMenuOpen = false;
  }

  function clearSelfLabels() {
      post.selfLabels = [];
      isSelfLabelingMenuOpen = false;
  }

  function handleAltClick(id: string | number) {
    altFocusPulse = id;
    isAltModalOpen = true;
  }
</script>

<svelte:document onpaste={handlePaste} />

<div class="publish-form"
     class:publish-form--dragover={isDragover}
     class:publish-form--fit={!$settings.design?.mobilePostLayoutTop}
     ondragover={(e) => {e.preventDefault()}}
     ondrop={handleDrop}
     ondragenter={handleDragover}
     ondragleave={handleDragleave}
>
  <Tiptap
          bind:text={post.text}
          bind:json={post.json}
          bind:this={editor}
          {onpublish}
          onupload={uploadContextOpen}
          onpicktenor={addTenorLinkCard}
          {_agent}
          {isEnabled}
          {isVideoUploadEnabled}
          {onopen}
          {submitArea}
          {publishContentLength}
  >
    {#snippet top()}
      {#if (post.replyRef && typeof post.replyRef !== 'string')}
        <div class="publish-quote publish-quote--reply">
          <button class="publish-quote__delete" onclick={() => {post.replyRef = undefined}}>
            <X color="#fff" size="18"></X>
          </button>

          <div class="timeline-external timeline-external--record timeline-external--record-publish">
            <div class="timeline-external__image timeline-external__image--round">
              {#if (post.replyRef.data.parent.author.avatar)}
                <img src="{post.replyRef.data.parent.author.avatar}" alt="">
              {/if}
            </div>

            <div class="timeline-external__content">
              <div class="timeline__meta timeline__meta--member">
                <p class="timeline__user">{post.replyRef.data.parent.author.displayName || post.replyRef.data.parent.author.handle}</p>

                <ThreadMembersList uri={post.replyRef.data.parent.uri} {_agent}></ThreadMembersList>
              </div>

              <p class="timeline-external__description">
                {post.replyRef.data.parent.record.text}
              </p>
            </div>
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

        {#if (!post.replyRef)}
          <button class="add-thread-button" disabled={isEnabled} onclick={addThread} aria-label="{$_('post_add_thread')}">
            <CirclePlus size="20"></CirclePlus>
          </button>
        {/if}
      </div>
    {/snippet}

    {#snippet normal()}
      <div class="publish-upload">
        <ImageUpload
          bind:this={imageUploadEl}
          bind:images={post.images}
          bind:video={post.video}
          onpreparestart={() => {isProcessed = true}}
          onprepareend={() => {isProcessed = false}}
          onaltclick={handleAltClick}
        ></ImageUpload>

        {#if post.quotePost?.uri}
          <div class="publish-quote">
            <button class="publish-quote__delete" onclick={() => {post.quotePost = undefined}}>
              <X color="#fff" size="18"></X>
            </button>

            {#if (isFeedByUri(post.quotePost.uri))}
              <FeedsItem {_agent} feed={post.quotePost} layout="publish"></FeedsItem>
            {:else}
              <EmbedRecord {_agent} record={post.quotePost} isPublish={true} isChild={true}></EmbedRecord>
            {/if}
          </div>
        {/if}

        {#if (post.embedExternal && !post.images.length)}
          <div class="publish-quote publish-quote--external">
            <button class="publish-quote__delete" onclick={() => {post.embedExternal = undefined; post.externalImageBlob = ''}}>
              <X color="#fff" size="18"></X>
            </button>

            {#if getTenorUrl(post.embedExternal.external.uri) && $settings?.embed?.tenor}
              <div class="publish-tenor-external" class:publish-tenor-external--bottom={$settings.design?.publishPosition === 'bottom'}>
                <EmbedTenor tenor={getTenorUrl(post.embedExternal.external.uri)}></EmbedTenor>
              </div>
            {:else}
              <div class="timeline-external timeline-external--record">
                <div class="timeline-external__image">
                  {#if (post.externalImageBlob)}
                    <img src="{post.externalImageBlob}" alt="">
                  {/if}
                </div>

                <div class="timeline-external__content">
                  <p class="timeline-external__title"><a href="{post.embedExternal.external.uri}" target="_blank" rel="noopener nofollow noreferrer">{post.embedExternal.external.title}</a></p>
                  <p class="timeline-external__description">{post.embedExternal.external.description}</p>
                  <p class="timeline-external__url">{post.embedExternal.external.uri}</p>
                </div>
              </div>
            {/if}
          </div>
        {/if}

        {#if (!post.embedExternal && links.length && !post.images.length)}
          <div class="link-card-registerer">
            {#each links as link}
              <button
                disabled={isLinkCardAdding}
                class="link-card-registerer-button"
                onclick={() => {addLinkCard(link)}}
              >
                {$_('link_card_embed')}: {link}
                {#if (isLinkCardAdding)}
                  <div class="link-card-registerer-button__spinner">
                    <LoadingSpinner padding={0} size={16}></LoadingSpinner>
                  </div>
                {/if}
              </button>
            {/each}
          </div>
        {/if}

        <div class="publish-tags">
          <button class="publish-lang" onclick={() => {isLangSelectorOpen = !isLangSelectorOpen}}>
            {#if (post.lang !== 'auto' && Array.isArray(post.lang))}
              {#each post.lang as lang}
                <span class="lang-label"><Globe size="16" color="var(--publish-tool-button-color)"></Globe> {$_(languageMap.get(lang)?.name)}</span>
              {/each}
            {:else}
              <span class="lang-label"><Globe size="16" color="var(--publish-tool-button-color)"></Globe> {$_('lang_selector_auto')}</span>
            {/if}
          </button>

          <div class="thread-gate-label-list" role="button" onclick={() => {isThreadGateOpen = !isThreadGateOpen}}>
            {#if (!post.replyRef)}
              <ThreadGateLabel {post}></ThreadGateLabel>
            {/if}

            {#if (post.postGate === false)}
              <PostGateLabel></PostGateLabel>
            {/if}
          </div>

          {#if (post.images.length)}
            <Menu bind:isMenuOpen={isSelfLabelingMenuOpen} buttonClassName="publish-form-moderation-button">
              {#snippet ref()}
                <SelfLabelLabel labels={post.selfLabels}></SelfLabelLabel>
              {/snippet}

              {#snippet content()}
                <ul  class="timeline-menu-list">
                  {#each selfLabelsChoices as choice, index}
                    <li class="timeline-menu-list__item">
                      <button class="timeline-menu-list__button" class:timeline-menu-list__button--active={post.selfLabels.some(label => label.val === choice.val)} onclick={() => setSelfLabel(index)}>{choice.name}</button>
                    </li>
                  {/each}

                  {#if (post.selfLabels.length)}
                    <li class="timeline-menu-list__item">
                      <button class="timeline-menu-list__button text-danger" onclick={clearSelfLabels}>{$_('selflabels_remove')}</button>
                    </li>
                  {/if}
                </ul>
              {/snippet}
            </Menu>
          {/if}
        </div>

        {#if (isAltTextRequired)}
          <Notice text={$_('alt_text_missing')}></Notice>
        {/if}
      </div>
    {/snippet}
  </Tiptap>
</div>

{#if (isLangSelectorOpen)}
  <LangSelectorModal onclose={() => {isLangSelectorOpen = false}} {post}></LangSelectorModal>
{/if}

{#if (isAltModalOpen)}
  <AltModal images={post.images} close={handleAltClose} {altFocusPulse}></AltModal>
{/if}

{#if (isThreadGateOpen)}
  <ThreadGateModal onclose={() => {isThreadGateOpen = false}} {_agent} {post}></ThreadGateModal>
{/if}

<style lang="postcss">
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

      &__spinner {
          position: absolute;
          right: 4px;
          top: 0;
          bottom: 0;
          display: grid;
          place-content: center;
      }
  }

  .publish-upload {
      padding: 0 12px;
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

  .publish-form {
      &--fit {
          @media (max-width: 767px) {
              .add-thread-button {
                  order: 1;
              }
          }
      }
  }

  .publish-lang {
      display: flex;
      justify-content: center;
      gap: 4px;
      color: var(--text-color-1);
      font-size: 14px;
  }

  .thread-gate-label-list {
      cursor: pointer;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      width: fit-content;
  }

  .lang-label {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      padding: 4px 8px;
      background-color: var(--bg-color-2);
      color: var(--text-color-2);
      font-weight: bold;
      border-radius: var(--border-radius-2);
      height: 30px;
  }

  .publish-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 8px;
      margin: 8px 0;
  }
</style>