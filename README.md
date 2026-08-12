# Gallery Swipe

A lightweight, dependency-free swipe gallery for modern browsers. It supports mouse and touch dragging, arrow and dot navigation, keyboard controls, responsive resizing, and accessible labels.

![Gallery Swipe preview](images/preview.png)

[Live demo](https://krnvst.github.io/gallery-swipe/)

## Installation

```bash
npm install gallery-swipe
```

Import the JavaScript and CSS in your application:

```js
import SwipeGallery from 'gallery-swipe';
import 'gallery-swipe/style.css';

const gallery = new SwipeGallery('#gallery', {
  margin: 12,
  speedTransition: 0.25,
  showDots: true
});
```

You can also provide images directly from JavaScript. Each item can be a URL or an object with image attributes:

```js
const gallery = new SwipeGallery('#gallery', {
  images: [
    { src: '/images/product-front.jpg', alt: 'Product from the front' },
    { src: '/images/product-side.jpg', alt: 'Product from the side', loading: 'lazy' },
    '/images/product-back.jpg'
  ]
});
```

Images passed through `images` replace any initial content inside `#gallery`. If the option is omitted, the library uses the existing HTML slides, as in the demo.

Replace images later without creating a new gallery instance:

```js
gallery.setImages([
  { src: '/new/photo-1.jpg', alt: 'First new photo' },
  { src: '/new/photo-2.jpg', alt: 'Second new photo' }
]);
```

The gallery element can contain images or any other HTML:

```html
<div id="gallery" class="swipe-gallery" aria-label="Product photos">
  <img src="photo-1.jpg" width="1200" height="400" alt="Front view">
  <img src="photo-2.jpg" width="1200" height="400" alt="Side view">
  <article>Any HTML content can be a slide.</article>
</div>
```

Add `class="swipe-gallery"` to the initial HTML container so the stylesheet can hide uninitialized slides before JavaScript runs. For images, include their real `width` and `height` attributes to reserve the correct aspect ratio and prevent layout shifts while files are loading.

### Script tag / CDN

The browser build exposes `GallerySwipe.SwipeGallery`:

```html
<link rel="stylesheet" href="https://unpkg.com/gallery-swipe/dist/gallery.css">
<script src="https://unpkg.com/gallery-swipe/dist/gallery.global.js"></script>
<script>
  const gallery = new GallerySwipe.SwipeGallery('#gallery');
</script>
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `margin` | `number` | `0` | Space between slides in pixels. |
| `speedTransition` | `number` | `0.25` | Animation duration in seconds. Numeric strings are accepted for compatibility. |
| `showDots` | `boolean` | `true` | Show dot navigation. |
| `showNav` | `boolean` | `true` | Show previous/next buttons. |
| `startIndex` | `number` | `0` | Initial zero-based slide index. |
| `swipeThreshold` | `number` | `0.15` | Portion of the width that completes a swipe, from `0` to `1`. |
| `keyboard` | `boolean` | `true` | Enable left/right arrow keys when the gallery is focused. |
| `images` | `Array<string \| object>` | Existing HTML | Images that replace the initial gallery content. |

## CSS classes

Generated elements use a consistent BEM naming scheme:

- `swipe-gallery` — gallery root;
- `swipe-gallery__viewport` — visible area;
- `swipe-gallery__track` — moving row of slides;
- `swipe-gallery__slide` — individual slide wrapper;
- `swipe-gallery__navigation` — previous and next controls;
- `swipe-gallery__pagination` — pagination container;
- `swipe-gallery__pagination-button` — pagination button;
- `swipe-gallery--dragging` and `swipe-gallery__track--dragging` — active drag state.

Customize the corner radius with a CSS variable:

```css
.swipe-gallery {
  --swipe-gallery-border-radius: 1rem;
}
```

## API

```js
gallery.currentIndex;        // Current zero-based index
gallery.length;              // Number of slides
gallery.nextSlide();         // Move forward
gallery.previousSlide();     // Move back
gallery.goToSlide(2);        // Move to a slide
gallery.setImages(images);   // Replace all images
gallery.updateLayout();      // Recalculate dimensions
gallery.destroy();           // Remove controls and restore original markup
```

Listen for slide changes:

```js
document.querySelector('#gallery').addEventListener('gallery:change', (event) => {
  console.log(event.detail.index, event.detail.slide);
});
```

## Development and publishing

```bash
npm install
npm run check
npm publish
```

`npm run check` runs the test suite, creates all package formats, and previews the exact files that npm will publish. Before the first publish, confirm that the package name is available and that you are logged in with `npm login`.

## License

[MIT](LICENSE)
