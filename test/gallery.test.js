// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import SwipeGallery from '../src/gallery.js';

function createSwipeGallery(slideCount = 3, options = {}) {
  document.body.innerHTML = `<div id="gallery">${
    Array.from({ length: slideCount }, (_, index) => `<img src="${index}.jpg" alt="Slide ${index + 1}">`).join('')
  }</div>`;
  const element = document.querySelector('#gallery');
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ width: 600 });
  return { element, gallery: new SwipeGallery(element, options) };
}

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('SwipeGallery', () => {
  it('builds controls and starts on the requested slide', () => {
    const { element, gallery } = createSwipeGallery(3, { startIndex: 1, margin: 10 });
    expect(gallery.currentIndex).toBe(1);
    expect(gallery.length).toBe(3);
    expect(element.classList.contains('swipe-gallery--initialized')).toBe(true);
    expect(element.querySelectorAll('.swipe-gallery__slide')).toHaveLength(3);
    expect(element.querySelector('.swipe-gallery__navigation').parentElement)
      .toBe(element.querySelector('.swipe-gallery__viewport'));
    expect(element.querySelectorAll('.swipe-gallery__arrow-icon')).toHaveLength(2);
    expect(element.querySelector('.swipe-gallery__track').style.transform)
      .toBe('translate3d(calc(-100% - 10px + 0px), 0, 0)');
  });

  it('moves within bounds and emits change details', () => {
    const { element, gallery } = createSwipeGallery();
    const listener = vi.fn();
    element.addEventListener('gallery:change', listener);
    expect(gallery.previousSlide()).toBe(false);
    expect(gallery.nextSlide()).toBe(true);
    expect(gallery.goToSlide(99)).toBe(true);
    expect(gallery.currentIndex).toBe(2);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener.mock.calls[1][0].detail.index).toBe(2);
  });

  it('requires a real element with at least one slide', () => {
    expect(() => new SwipeGallery('.missing')).toThrow(/requires an element/i);
    document.body.innerHTML = '<div id="empty"></div>';
    expect(() => new SwipeGallery('#empty')).toThrow(/at least one slide/i);
  });

  it('rejects duplicate initialization', () => {
    const { element } = createSwipeGallery();
    expect(() => new SwipeGallery(element)).toThrow(/already has/i);
  });

  it('restores the original markup on destroy and can be initialized again', () => {
    const { element, gallery } = createSwipeGallery();
    const originalSlides = [...gallery.slides];
    element.setAttribute('data-preserved', 'yes');
    gallery.destroy();
    expect([...element.children]).toEqual(originalSlides);
    expect(element.classList.contains('swipe-gallery')).toBe(false);
    expect(element.classList.contains('swipe-gallery--initialized')).toBe(false);
    expect(element.dataset.preserved).toBe('yes');
    expect(() => new SwipeGallery(element)).not.toThrow();
  });

  it('does not change slides for a short drag', () => {
    const { element, gallery } = createSwipeGallery();
    const track = element.querySelector('.swipe-gallery__track');
    track.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 300, button: 0 }));
    track.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 290 }));
    track.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 290 }));
    expect(gallery.currentIndex).toBe(0);
  });

  it('updates its measured width immediately during window resize', () => {
    document.body.innerHTML = '<div id="gallery"><div>One</div><div>Two</div></div>';
    const element = document.querySelector('#gallery');
    let width = 600;
    vi.spyOn(element, 'getBoundingClientRect').mockImplementation(() => ({ width }));
    const gallery = new SwipeGallery(element, { startIndex: 1, margin: 10 });

    width = 320;
    window.dispatchEvent(new Event('resize'));

    expect(gallery.width).toBe(320);
    expect(element.querySelector('.swipe-gallery__slide').style.flexBasis).toBe('');
    expect(element.querySelector('.swipe-gallery__track').style.transform)
      .toBe('translate3d(calc(-100% - 10px + 0px), 0, 0)');
  });

  it('disables the slide transition after movement so resize cannot animate', () => {
    const { element, gallery } = createSwipeGallery();
    const track = element.querySelector('.swipe-gallery__track');

    gallery.nextSlide();
    expect(track.style.transitionDuration).toBe('0.25s');

    const transitionEnd = new Event('transitionend');
    Object.defineProperty(transitionEnd, 'propertyName', { value: 'transform' });
    track.dispatchEvent(transitionEnd);

    expect(track.style.transitionDuration).toBe('0s');
  });

  it('restores accessibility attributes that existed before initialization', () => {
    document.body.innerHTML = '<section id="gallery" role="group" aria-roledescription="photos"><div>One</div></section>';
    const element = document.querySelector('#gallery');
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ width: 600 });
    const gallery = new SwipeGallery(element);
    gallery.destroy();
    expect(element.getAttribute('role')).toBe('group');
    expect(element.getAttribute('aria-roledescription')).toBe('photos');
  });

  it('accepts images in constructor options', () => {
    document.body.innerHTML = '<div id="gallery"><span>Old content</span></div>';
    const element = document.querySelector('#gallery');
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ width: 600 });
    const gallery = new SwipeGallery(element, {
      images: [
        { src: '/one.jpg', alt: 'One' },
        '/two.jpg'
      ]
    });

    expect(gallery.length).toBe(2);
    expect(gallery.slides[0].getAttribute('src')).toBe('/one.jpg');
    expect(gallery.slides[0].alt).toBe('One');
    expect(element.textContent).not.toContain('Old content');
  });

  it('replaces images after initialization', () => {
    const { element, gallery } = createSwipeGallery();
    const listener = vi.fn();
    element.addEventListener('gallery:change', listener);

    gallery.setImages([
      { src: '/new-one.jpg', alt: 'New one' },
      { src: '/new-two.jpg', alt: 'New two' }
    ], { startIndex: 1 });

    expect(gallery.length).toBe(2);
    expect(gallery.currentIndex).toBe(1);
    expect(element.querySelectorAll('.swipe-gallery__slide')).toHaveLength(2);
    expect(element.querySelectorAll('.swipe-gallery__pagination-button')).toHaveLength(2);
    expect(gallery.slides[1].alt).toBe('New two');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
