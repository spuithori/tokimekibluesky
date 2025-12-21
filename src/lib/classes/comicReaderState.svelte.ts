import type {GalleryImage} from "$lib/classes/imageState.svelte";

class ComicReaderState {
  pages = $state<GalleryImage[]>([]);
  startIndex = $state<number>(0);

  open(pages: GalleryImage[], startIndex = 0) {
    if (!pages?.length) {
      this.pages = [];
      this.startIndex = 0;
      return;
    }

    const clamped = Math.min(Math.max(startIndex, 0), pages.length - 1);
    this.pages = pages;
    this.startIndex = clamped;
  }

  close() {
    this.pages = [];
    this.startIndex = 0;
  }
}

export const comicReaderState = new ComicReaderState();
