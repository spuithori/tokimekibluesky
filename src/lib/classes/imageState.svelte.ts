export type GalleryImage = {
  src: string,
  msrc: string,
  width?: number,
  height?: number,
  alt?: string,
}

class ImageState {
  images = $state<GalleryImage[]>([]);
  startIndex = $state<number>(0);
  comicReaderImages = $state<GalleryImage[]>([]);
  comicReaderStartIndex = $state<number>(0);

  open(
    images: GalleryImage[],
    startIndex: number,
    options?: {
      comicReaderImages?: GalleryImage[];
      comicReaderStartIndex?: number;
    }
  ) {
    this.images = images;
    this.startIndex = startIndex;
    this.comicReaderImages = options?.comicReaderImages ?? images;
    this.comicReaderStartIndex = options?.comicReaderStartIndex ?? startIndex;
  }

  close() {
    setTimeout(() => {
      this.images = [];
      this.comicReaderImages = [];
      this.comicReaderStartIndex = 0;
    }, 300);
  }
}

export const imageState = new ImageState();
