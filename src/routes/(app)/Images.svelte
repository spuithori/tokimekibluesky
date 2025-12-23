<script lang="ts">
    import {AppBskyEmbedImages} from "@atproto/api";
    import {settings, isDataSaving} from '$lib/stores';
    import GifImage from "$lib/components/post/GifImage.svelte";
    import {imageState, type GalleryImage} from "$lib/classes/imageState.svelte";
    import ImageLoader from "$lib/components/utils/ImageLoader.svelte";

    interface ThreadContext {
      feed?: any[];
      postUri?: string;
      authorDid?: string;
    }

    interface Props {
      images: any[];
      blobs?: any[];
      did?: string;
      folding?: boolean;
      threadContext?: ThreadContext;
    }

    let {
      images,
      blobs = [],
      did = '',
      folding = false,
      threadContext
    }: Props = $props();

    const galleryImages = toGalleryImages(images);
    const threadComicReader = $derived.by(() => buildThreadComicReader(threadContext));

    let isFold = $state($settings?.design.postsImageLayout === 'folding' || $isDataSaving || folding);

    function toGalleryImages(source: any[]): GalleryImage[] {
      return source.map(image => ({
        src: image.fullsize,
        msrc: image.thumb,
        width: image?.aspectRatio?.width,
        height: image?.aspectRatio?.height,
        alt: image.alt || '',
      }));
    }

    function extractPostImages(post: any) {
      if (AppBskyEmbedImages.isView(post?.embed)) {
        return post.embed.images;
      }

      if (AppBskyEmbedImages.isView(post?.embed?.media)) {
        return post.embed.media.images;
      }

      return [];
    }

    function buildThreadComicReader(context?: ThreadContext) {
      if (!context?.authorDid || !Array.isArray(context.feed) || !context.feed.length) {
        return null;
      }

      const posts = context.feed
        .map(item => item?.post)
        .filter(Boolean)
        .filter(post => post?.author?.did === context.authorDid);

      if (!posts.length) {
        return null;
      }

      const sortedPosts = posts
        .map((post, order) => ({post, order}))
        .sort((a, b) => {
          const timeA = new Date(a.post?.record?.createdAt || 0).getTime();
          const timeB = new Date(b.post?.record?.createdAt || 0).getTime();

          if (timeA === timeB) {
            return a.order - b.order;
          }

          return timeA - timeB;
        })
        .map(({post}) => post);

      const offsets = new Map<string, number>();
      const comicReaderImages: GalleryImage[] = [];

      for (const post of sortedPosts) {
        const postImages = extractPostImages(post);
        if (!postImages.length) {
          continue;
        }

        offsets.set(post.uri, comicReaderImages.length);
        comicReaderImages.push(...toGalleryImages(postImages));
      }

      if (!comicReaderImages.length) {
        return null;
      }

      return {images: comicReaderImages, offsets};
    }

    function handleOpen(index: number) {
      let comicReaderImages = galleryImages;
      let comicReaderStartIndex = index;

      if (threadComicReader && threadContext?.postUri) {
        const offset = threadComicReader.offsets.get(threadContext.postUri);

        if (offset !== undefined) {
          comicReaderImages = threadComicReader.images;
          comicReaderStartIndex = offset + index;
        }
      }

      imageState.open(galleryImages, index, {comicReaderImages, comicReaderStartIndex});
    }

    function unfold() {
        isFold = false;
    }
</script>

{#if isFold}
  <button class="image-unfold-button" onclick={unfold}>
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="17.143" viewBox="0 0 20 17.143">
      <path id="image" d="M49.143,64H34.857A2.86,2.86,0,0,0,32,66.857V78.286a2.86,2.86,0,0,0,2.857,2.857H49.143A2.86,2.86,0,0,0,52,78.286V66.857A2.86,2.86,0,0,0,49.143,64Zm-3.571,2.857A2.143,2.143,0,1,1,43.429,69a2.143,2.143,0,0,1,2.143-2.143ZM34.857,79.714a1.429,1.429,0,0,1-1.429-1.429V75.267L37.662,71.5a2.146,2.146,0,0,1,2.938.085l2.9,2.893-5.233,5.233Zm15.714-1.429a1.429,1.429,0,0,1-1.429,1.429H40.287l5.421-5.421a2.13,2.13,0,0,1,2.752-.007l2.112,1.76Z" transform="translate(-32 -64)" fill="#aeaeae"/>
    </svg>
    <span>×</span>
    <span>{images.length}</span>
  </button>
{:else}
  <div
      class="timeline-images"
      class:timeline-images--compact={$settings?.design.postsImageLayout === 'compact'}
      class:timeline-images--nocrop={$settings?.design.oneImageNoCrop}
  >
    {#each images as image, index (image)}
      <div class="timeline-image">
        {#if (blobs[index]?.image.mimeType === 'image/gif')}
          <GifImage {did} blob={blobs[index]?.image} alt={image.alt}></GifImage>
        {:else}
          <button onclick={() => handleOpen(index)} aria-label="Open image.">
            <ImageLoader {image} naturalWidth={(v) => {galleryImages[index].width = v}} naturalHeight={(v) => {galleryImages[index].height = v}}></ImageLoader>
          </button>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<style lang="postcss">
    .timeline-image {
        width: 100%;
        height: 100%;
        aspect-ratio: 1 / 1;
        overflow: hidden;
        border-radius: 6px;
        display: flex;

        &:only-child {
            grid-column: span 2;
        }

        button {
            width: 100%;
            height: 100%;
            cursor: zoom-in;
        }
    }

    .image-unfold-button {
        border: 1px solid var(--border-color-1);
        border-radius: 4px;
        padding: 0 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 30px;
        gap: 5px;
        color: var(--text-color-3);
        transition: all .2s ease-in-out;

        path {
            transition: all .2s ease-in-out;
        }
        
        &:hover {
            background-color: var(--bg-color-2);
            color: var(--primary-color);

            path {
                fill: var(--primary-color);
            }
        }
    }
</style>
