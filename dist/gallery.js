const galleryInstances = new WeakMap();

const DEFAULT_GALLERY_OPTIONS = Object.freeze({
  margin: 0,
  speedTransition: 0.25,
  showDots: true,
  showNav: true,
  startIndex: 0,
  swipeThreshold: 0.15,
  keyboard: true
});

function parseNumericOption(value, fallback, name, { min = 0, max = Infinity } = {}) {
  if (value === undefined) return fallback;
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new TypeError(`SwipeGallery option "${name}" must be a number between ${min} and ${max}.`);
  }
  return number;
}

function parseBooleanOption(value, fallback, name) {
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') {
    throw new TypeError(`SwipeGallery option "${name}" must be a boolean.`);
  }
  return value;
}

function resolveGalleryElement(element) {
  const resolved = typeof element === 'string' ? document.querySelector(element) : element;
  if (!resolved || resolved.nodeType !== 1) {
    throw new TypeError('SwipeGallery requires an element or a selector matching an element.');
  }
  return resolved;
}

function formatPixelOffset(value) {
  return `${value < 0 ? '-' : '+'} ${Math.abs(value)}px`;
}

function createImageElements(images) {
  if (!Array.isArray(images) || images.length === 0) {
    throw new TypeError('SwipeGallery images must be a non-empty array.');
  }

  return images.map((image, index) => {
    const config = typeof image === 'string' ? { src: image } : image;
    if (!config || typeof config.src !== 'string' || config.src.trim() === '') {
      throw new TypeError(`SwipeGallery image at index ${index} requires a non-empty "src".`);
    }

    const element = document.createElement('img');
    element.src = config.src;
    element.alt = typeof config.alt === 'string' ? config.alt : '';
    if (config.loading === 'lazy' || config.loading === 'eager') {
      element.loading = config.loading;
    }
    return element;
  });
}

class SwipeGallery {
  constructor(element, options = {}) {
    this.container = resolveGalleryElement(element);
    if (galleryInstances.has(this.container)) {
      throw new Error('This element already has a SwipeGallery instance. Destroy it before creating another one.');
    }

    this.options = {
      margin: parseNumericOption(options.margin, DEFAULT_GALLERY_OPTIONS.margin, 'margin'),
      speedTransition: parseNumericOption(
        options.speedTransition,
        DEFAULT_GALLERY_OPTIONS.speedTransition,
        'speedTransition'
      ),
      showDots: parseBooleanOption(options.showDots, DEFAULT_GALLERY_OPTIONS.showDots, 'showDots'),
      showNav: parseBooleanOption(options.showNav, DEFAULT_GALLERY_OPTIONS.showNav, 'showNav'),
      startIndex: parseNumericOption(options.startIndex, DEFAULT_GALLERY_OPTIONS.startIndex, 'startIndex'),
      swipeThreshold: parseNumericOption(
        options.swipeThreshold,
        DEFAULT_GALLERY_OPTIONS.swipeThreshold,
        'swipeThreshold',
        { min: 0, max: 1 }
      ),
      keyboard: parseBooleanOption(options.keyboard, DEFAULT_GALLERY_OPTIONS.keyboard, 'keyboard')
    };

    if (options.images !== undefined) {
      this.container.replaceChildren(...createImageElements(options.images));
    }

    this.slides = Array.from(this.container.children);
    if (this.slides.length === 0) {
      throw new Error('SwipeGallery requires at least one slide.');
    }

    this.index = Math.min(Math.floor(this.options.startIndex), this.slides.length - 1);
    this.destroyed = false;
    this.pointerId = null;
    this.dragOffset = 0;
    this.suppressClick = false;
    this.suppressClickTimer = null;
    this.transitionResetTimer = null;
    this.hadRootClass = this.container.classList.contains('swipe-gallery');
    this.hadInitializedClass = this.container.classList.contains('swipe-gallery--initialized');
    this.originalTabIndex = this.container.getAttribute('tabindex');
    this.originalRole = this.container.getAttribute('role');
    this.originalRoleDescription = this.container.getAttribute('aria-roledescription');

    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerEnd = this.handlePointerEnd.bind(this);
    this.preventClickAfterDrag = this.preventClickAfterDrag.bind(this);
    this.handlePaginationClick = this.handlePaginationClick.bind(this);
    this.handleKeyboardNavigation = this.handleKeyboardNavigation.bind(this);
    this.handleTrackTransitionEnd = this.handleTrackTransitionEnd.bind(this);
    this.disableTrackTransition = this.disableTrackTransition.bind(this);
    this.updateLayout = this.updateLayout.bind(this);

    this.createGalleryStructure();
    this.attachEventListeners();
    galleryInstances.set(this.container, this);
    this.updateLayout();
    this.container.classList.add('swipe-gallery--initialized');
  }

  get currentIndex() {
    return this.index;
  }

  get length() {
    return this.slides.length;
  }

  createGalleryStructure() {
    this.container.classList.add('swipe-gallery');
    this.container.setAttribute('role', 'region');
    this.container.setAttribute('aria-roledescription', 'carousel');
    if (this.options.keyboard && !this.container.hasAttribute('tabindex')) {
      this.container.tabIndex = 0;
    }

    this.viewportElement = document.createElement('div');
    this.viewportElement.className = 'swipe-gallery__viewport';
    this.trackElement = document.createElement('div');
    this.trackElement.className = 'swipe-gallery__track';
    this.viewportElement.append(this.trackElement);

    this.slideElements = this.createSlideElements(this.slides);

    this.navigationElement = document.createElement('div');
    this.navigationElement.className = 'swipe-gallery__navigation';
    this.previousButton = this.createControlButton('swipe-gallery__previous-button', 'Previous slide');
    this.nextButton = this.createControlButton('swipe-gallery__next-button', 'Next slide');
    this.previousButton.append(this.createArrowIcon('previous'));
    this.nextButton.append(this.createArrowIcon('next'));
    this.navigationElement.append(this.previousButton, this.nextButton);
    this.navigationElement.hidden = !this.options.showNav;
    this.viewportElement.append(this.navigationElement);

    this.paginationElement = document.createElement('div');
    this.paginationElement.className = 'swipe-gallery__pagination';
    this.paginationElement.hidden = !this.options.showDots;
    this.paginationButtons = this.createPaginationButtons();

    this.container.append(this.viewportElement, this.paginationElement);
  }

  createSlideElements(slides) {
    return slides.map((slide, index) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'swipe-gallery__slide';
      wrapper.setAttribute('role', 'group');
      wrapper.setAttribute('aria-roledescription', 'slide');
      wrapper.setAttribute('aria-label', `${index + 1} of ${slides.length}`);
      wrapper.append(slide);
      this.trackElement.append(wrapper);
      return wrapper;
    });
  }

  createPaginationButtons() {
    return this.slides.map((_, index) => {
      const dot = this.createControlButton('swipe-gallery__pagination-button', `Go to slide ${index + 1}`);
      dot.dataset.swipeGalleryIndex = String(index);
      this.paginationElement.append(dot);
      return dot;
    });
  }

  createControlButton(className, label, content = '') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.setAttribute('aria-label', label);
    button.textContent = content;
    return button;
  }

  createArrowIcon(direction) {
    const svgNamespace = 'http://www.w3.org/2000/svg';
    const icon = document.createElementNS(svgNamespace, 'svg');
    const path = document.createElementNS(svgNamespace, 'path');

    icon.classList.add('swipe-gallery__arrow-icon');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('aria-hidden', 'true');
    icon.setAttribute('focusable', 'false');

    path.setAttribute('d', direction === 'previous' ? 'M15 18L9 12L15 6' : 'M9 18L15 12L9 6');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '1.5');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    icon.append(path);

    return icon;
  }

  attachEventListeners() {
    this.trackElement.addEventListener('pointerdown', this.handlePointerDown);
    this.trackElement.addEventListener('pointermove', this.handlePointerMove);
    this.trackElement.addEventListener('pointerup', this.handlePointerEnd);
    this.trackElement.addEventListener('pointercancel', this.handlePointerEnd);
    this.trackElement.addEventListener('click', this.preventClickAfterDrag, true);
    this.trackElement.addEventListener('transitionend', this.handleTrackTransitionEnd);
    this.previousButton.addEventListener('click', () => this.previousSlide());
    this.nextButton.addEventListener('click', () => this.nextSlide());
    this.paginationElement.addEventListener('click', this.handlePaginationClick);
    this.container.addEventListener('keydown', this.handleKeyboardNavigation);

    // The window event updates the swipe threshold synchronously while the
    // viewport is being resized. ResizeObserver also covers parent-only resizes.
    window.addEventListener('resize', this.updateLayout);
    if (typeof ResizeObserver === 'function') {
      this.resizeObserver = new ResizeObserver(this.updateLayout);
      this.resizeObserver.observe(this.container);
    }
  }

  updateLayout() {
    if (this.destroyed) return;
    this.width = this.container.getBoundingClientRect().width;
    this.trackElement.style.gap = `${this.options.margin}px`;
    this.updateGalleryState(false);
  }

  handlePointerDown(event) {
    if (this.pointerId !== null || (event.button !== undefined && event.button !== 0)) return;
    this.pointerId = event.pointerId;
    this.startX = event.clientX;
    this.dragOffset = 0;
    this.trackElement.classList.add('swipe-gallery__track--dragging');
    this.container.classList.add('swipe-gallery--dragging');
    this.trackElement.setPointerCapture?.(event.pointerId);
  }

  handlePointerMove(event) {
    if (event.pointerId !== this.pointerId) return;
    this.dragOffset = event.clientX - this.startX;
    const atStart = this.index === 0 && this.dragOffset > 0;
    const atEnd = this.index === this.length - 1 && this.dragOffset < 0;
    const resistance = atStart || atEnd ? 0.2 : 1;
    this.updateTrackPosition(this.dragOffset * resistance);
  }

  handlePointerEnd(event) {
    if (event.pointerId !== this.pointerId) return;
    const offset = this.dragOffset;
    const threshold = Math.max(30, this.width * this.options.swipeThreshold);
    this.pointerId = null;
    this.dragOffset = 0;
    this.trackElement.classList.remove('swipe-gallery__track--dragging');
    this.container.classList.remove('swipe-gallery--dragging');

    if (Math.abs(offset) >= 5) {
      this.suppressClick = true;
      clearTimeout(this.suppressClickTimer);
      this.suppressClickTimer = setTimeout(() => {
        this.suppressClick = false;
      }, 0);
    }

    if (Math.abs(offset) >= threshold) {
      offset < 0 ? this.nextSlide() : this.previousSlide();
    } else {
      this.updateGalleryState(true);
    }
  }

  preventClickAfterDrag(event) {
    if (!this.suppressClick) return;
    event.preventDefault();
    event.stopPropagation();
    this.suppressClick = false;
  }

  handlePaginationClick(event) {
    const button = event.target.closest('[data-swipe-gallery-index]');
    if (!button || !this.paginationElement.contains(button)) return;
    this.goToSlide(Number(button.dataset.swipeGalleryIndex));
  }

  handleKeyboardNavigation(event) {
    if (!this.options.keyboard) return;
    if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.previousSlide();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.nextSlide();
    }
  }

  handleTrackTransitionEnd(event) {
    if (event.target !== this.trackElement || event.propertyName !== 'transform') return;
    this.disableTrackTransition();
  }

  disableTrackTransition() {
    clearTimeout(this.transitionResetTimer);
    this.transitionResetTimer = null;
    this.trackElement.style.transitionDuration = '0s';
  }

  goToSlide(index, { animate = true, emit = true } = {}) {
    if (this.destroyed) return false;
    const requestedIndex = Number(index);
    if (!Number.isInteger(requestedIndex)) {
      throw new TypeError('SwipeGallery.goToSlide(index) requires an integer index.');
    }
    const nextIndex = Math.max(0, Math.min(requestedIndex, this.length - 1));
    const changed = nextIndex !== this.index;
    this.index = nextIndex;
    this.updateGalleryState(animate && changed);

    if (changed && emit) {
      this.container.dispatchEvent(new CustomEvent('gallery:change', {
        detail: { index: this.index, slide: this.slides[this.index] }
      }));
    }
    return changed;
  }

  nextSlide() {
    return this.goToSlide(this.index + 1);
  }

  previousSlide() {
    return this.goToSlide(this.index - 1);
  }

  setImages(images, { startIndex = 0, emit = true } = {}) {
    if (this.destroyed) return false;
    const nextSlides = createImageElements(images);
    const requestedIndex = Number(startIndex);
    if (!Number.isInteger(requestedIndex)) {
      throw new TypeError('SwipeGallery.setImages() requires an integer startIndex.');
    }

    this.slides = nextSlides;
    this.index = Math.max(0, Math.min(requestedIndex, this.slides.length - 1));
    this.trackElement.replaceChildren();
    this.paginationElement.replaceChildren();
    this.slideElements = this.createSlideElements(this.slides);
    this.paginationButtons = this.createPaginationButtons();
    this.updateLayout();

    if (emit) {
      this.container.dispatchEvent(new CustomEvent('gallery:change', {
        detail: { index: this.index, slide: this.slides[this.index] }
      }));
    }
    return true;
  }

  updateGalleryState(animate) {
    clearTimeout(this.transitionResetTimer);
    this.trackElement.style.transitionDuration = animate ? `${this.options.speedTransition}s` : '0s';
    this.updateTrackPosition(0);
    if (animate) {
      // transitionend may not fire for hidden elements or reduced-motion mode.
      this.transitionResetTimer = setTimeout(
        this.disableTrackTransition,
        this.options.speedTransition * 1000 + 50
      );
    }
    this.slideElements.forEach((slide, index) => {
      const hidden = index !== this.index;
      slide.setAttribute('aria-hidden', String(hidden));
      slide.inert = hidden;
    });
    this.paginationButtons.forEach((dot, index) => {
      const active = index === this.index;
      dot.classList.toggle('swipe-gallery__pagination-button--active', active);
      dot.setAttribute('aria-current', active ? 'true' : 'false');
    });
    this.previousButton.disabled = this.index === 0;
    this.nextButton.disabled = this.index === this.length - 1;
  }

  updateTrackPosition(offset) {
    const slideOffset = this.index * -100;
    const marginOffset = this.index * -this.options.margin;
    this.trackElement.style.transform =
      `translate3d(calc(${slideOffset}% ${formatPixelOffset(marginOffset)} ${formatPixelOffset(offset)}), 0, 0)`;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.resizeObserver?.disconnect();
    window.removeEventListener('resize', this.updateLayout);
    this.trackElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.trackElement.removeEventListener('pointermove', this.handlePointerMove);
    this.trackElement.removeEventListener('pointerup', this.handlePointerEnd);
    this.trackElement.removeEventListener('pointercancel', this.handlePointerEnd);
    this.trackElement.removeEventListener('click', this.preventClickAfterDrag, true);
    this.trackElement.removeEventListener('transitionend', this.handleTrackTransitionEnd);
    this.paginationElement.removeEventListener('click', this.handlePaginationClick);
    this.container.removeEventListener('keydown', this.handleKeyboardNavigation);

    this.container.replaceChildren(...this.slides);
    clearTimeout(this.suppressClickTimer);
    clearTimeout(this.transitionResetTimer);
    if (!this.hadRootClass) this.container.classList.remove('swipe-gallery');
    if (!this.hadInitializedClass) this.container.classList.remove('swipe-gallery--initialized');
    this.container.classList.remove('swipe-gallery--dragging');
    if (this.originalRole === null) this.container.removeAttribute('role');
    else this.container.setAttribute('role', this.originalRole);
    if (this.originalRoleDescription === null) this.container.removeAttribute('aria-roledescription');
    else this.container.setAttribute('aria-roledescription', this.originalRoleDescription);
    if (this.originalTabIndex === null) this.container.removeAttribute('tabindex');
    else this.container.setAttribute('tabindex', this.originalTabIndex);
    galleryInstances.delete(this.container);
  }
}

export { SwipeGallery, SwipeGallery as default };
//# sourceMappingURL=gallery.js.map
