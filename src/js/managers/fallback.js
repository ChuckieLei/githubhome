import { GLOBE_CONTAINER } from '../core/constants.js';

export function showFallback() {
  // Check connection to decide appropiate fallback
  // Default to video, but if there's a slow connection, show the image instead
  const connection = navigator.connection;
  if (connection === undefined) {
    showFallbackVideo();
    return;
  }

  showFallbackImage();
}

function showFallbackImage() {
  removeWebGLElements();

  const globeContainer = document.querySelector(GLOBE_CONTAINER);
  if (!globeContainer) return;

  const fallbackImage = globeContainer.querySelector('.js-globe-fallback-image');
  fallbackImage.removeAttribute('hidden');
}

function showFallbackVideo() {
  removeWebGLElements();

  const globeContainer = document.querySelector(GLOBE_CONTAINER);
  if (!globeContainer) return;

  const videoSelector = window.innerWidth <= 500 ? '.js-globe-fallback-video-small' : '.js-globe-fallback-video';
  const fallbackVideo = globeContainer.querySelector(videoSelector);
  fallbackVideo.removeAttribute('hidden');
  fallbackVideo.play();
}

function removeWebGLElements() {
  const globeContainer = document.querySelector(GLOBE_CONTAINER);

  if (!globeContainer) return;
  if (!globeContainer.hasChildNodes()) return;

  const globeContainerParent = globeContainer.parentNode;
  if (globeContainerParent) globeContainerParent.classList.remove('home-globe-container-webgl');

  const globePlaceholder = globeContainer.querySelector('.js-webgl-globe-loading');
  if (globePlaceholder) globeContainer.removeChild(globePlaceholder);

  const globeCanvas = globeContainer.querySelector('.js-globe-canvas');
  if (globeCanvas) globeContainer.removeChild(globeCanvas);

  const globePopup = globeContainer.querySelector('.js-globe-popup');
  if (globePopup) globeContainer.removeChild(globePopup);
}
