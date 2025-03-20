type GalleryImage = {
  src: string,
  msrc: string,
  width?: number,
  height?: number,
  alt?: string,
}

class ImageState {
  images = $state<GalleryImage[]>([]);
  startIndex = $state<number>(0);

  open(images: GalleryImage[], startIndex: number) {
    this.images = images;
    this.startIndex = startIndex;
  }

  close() {
    setTimeout(() => {
      this.images = [];
    }, 300);
  }
}

export const imageState = new ImageState();
