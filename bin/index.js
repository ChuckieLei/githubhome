import WebGLHeader from './core/webgl-header.js';
import { GLOBE_RADIUS, GLOBE_CONTAINER } from './core/constants.js';
import { showFallback } from './managers/fallback.js';
// import '../scss/main.scss';

let globeContainer;

function ready() {
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    document.addEventListener('DOMContentLoaded', () => {
      resolve();
    });
  });
}

function webGLSupported() {
  const canvas = document.createElement('canvas');
  const webGLContext = canvas.getContext('webgl') || canvas.getContext('webgl2') || canvas.getContext('experimental-webgl');

  return webGLContext instanceof WebGLRenderingContext;
}


(async function onload() {
  await ready();

  globeContainer = document.querySelector(GLOBE_CONTAINER);

  if (!globeContainer) return;
  if (!webGLSupported()) return showFallback();

  let basePath = 'webgl-globe/';
  let imagePath = 'images/';
  const dataPath = `${basePath}data/`;

  // If running on .com production (not review-lab), use url from assets link element in head
  const cdnURL = document.head.querySelector('link[rel=assets]');
  if (cdnURL !== null && !cdnURL.href.includes('localhost') && cdnURL.href !== '/') {
    basePath = cdnURL.href;
    imagePath = 'images/modules/site/home/globe/';
  }

  const app = new WebGLHeader({
    basePath,
    imagePath,
    dataPath,
    parentNode: globeContainer, // element to add webgl canvas to.
    globeRadius: GLOBE_RADIUS, // globe radius.
    lineWidth: 1.5, // width of the data lines.
    spikeRadius: 0.06, // radius of the spikes.
  });

  app.init().then(() => {
    app.canvas.addEventListener('webglcontextlost', showFallback, false);
  });
})();
 