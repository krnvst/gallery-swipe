export interface SwipeGalleryOptions {
  images?: Array<GalleryImage | string>;
  margin?: number;
  /** Transition duration in seconds. */
  speedTransition?: number | `${number}`;
  showDots?: boolean;
  showNav?: boolean;
  startIndex?: number;
  /** Portion of the gallery width required to change slides, from 0 to 1. */
  swipeThreshold?: number;
  keyboard?: boolean;
}

export interface GalleryImage {
  src: string;
  alt?: string;
  loading?: 'eager' | 'lazy';
}

export interface SetImagesOptions {
  startIndex?: number;
  emit?: boolean;
}

export interface SlideNavigationOptions {
  animate?: boolean;
  emit?: boolean;
}

export declare class SwipeGallery {
  constructor(element: Element | string, options?: SwipeGalleryOptions);
  readonly container: Element;
  readonly currentIndex: number;
  readonly length: number;
  goToSlide(index: number, options?: SlideNavigationOptions): boolean;
  nextSlide(): boolean;
  previousSlide(): boolean;
  setImages(images: Array<GalleryImage | string>, options?: SetImagesOptions): boolean;
  updateLayout(): void;
  destroy(): void;
}

export default SwipeGallery;
