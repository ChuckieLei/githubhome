/* eslint-disable camelcase */
/* eslint-disable no-continue */
import WebGLController from '../managers/webgl-controller.js';
import { isMobile as mobileTest } from '../utils/utils.js';
import { EVENTS, VISIBLE_DATA_COUNT } from './constants.js';
import Loader, { getData } from '../utils/loader.js';
import EventManager from '../managers/event-manager.js';
import { AppProps, setAppProps } from './app-props.js';
import { showFallback } from '../managers/fallback.js';

export default class WebGLHeader {
  constructor(props) {
    this.init = this.init.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);

    setAppProps({
      app: this,
      env: process.env.NODE_ENV,
      isMobile: mobileTest(),
      pixelRatio: window.devicePixelRatio || 1,
      ...props,
    });
  }

  loadAssets() {
    const { basePath, imagePath } = AppProps;

    // eslint-disable-next-line no-nested-ternary
    const manifest = [
      { url: `${basePath}${imagePath}map.png`, id: 'worldMap' }
    ];

    const loader = new Loader();

    return new Promise((resolve, reject) => {
      loader
        .load(manifest)
        .then(({ assets }) => {
          resolve(assets);
          loader.dispose();
        })
        .catch((error) => reject(error));
    });
  }

  async loadData() {
    try {
      const response = await getData(`${AppProps.dataPath}data.json`);

      if (!response || response.length === 0) {
        throw new Error('WebGL Globe: data.json response was empty');
      }
      
      return response;
    } catch {
      const fallback = await this.loadFallbackData();
      return fallback;
    }
  }

  async loadFallbackData() {
    try {
      const response = await getData(`${AppProps.dataPath}fallback.json`);

      if (!response || response.length === 0) {
        throw new Error('WebGL Globe: fallback.json response was empty');
      }
      
      return response;
    } catch (error) {
      throw new Error(error);
    }
  }
 
  filterData(data) {
    const filtered = [];

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const geo_user_opened = item.gop;
      const geo_user_merged = item.gm;

      // check that geo location data is present
      if (!(geo_user_opened || geo_user_merged)) continue;
      // Fill in missing data
      item.gop = geo_user_opened || geo_user_merged;
      item.gm = geo_user_merged || geo_user_opened;
      item.uol = item.uol || item.uml;
      item.uml = item.uml || item.uol;
      // Sanity check
      if (!item.gop.lat || !item.gop.lon) continue;
      if (!item.gm.lat || !item.gm.lon) continue;
      if (!(item.oa || item.ma)) continue;
      // Insert att random position
      filtered.splice(Math.floor(Math.random() * filtered.length), 0, item);
    }
    // For smooth transitions, pad the data
    const itemsEnd = filtered.slice(filtered.length - VISIBLE_DATA_COUNT, filtered.length);
    const itemsStart = filtered.slice(0, VISIBLE_DATA_COUNT);
    return itemsEnd.concat(filtered, itemsStart);
  }

  trackPageVisibility() {
    let hidden;
    let visibilityChange;
    if (typeof document.hidden !== 'undefined') {
      // Opera 12.10 and Firefox 18 and later support
      hidden = 'hidden';
      visibilityChange = 'visibilitychange';
    } else if (typeof document.msHidden !== 'undefined') {
      hidden = 'msHidden';
      visibilityChange = 'msvisibilitychange';
    } else if (typeof document.webkitHidden !== 'undefined') {
      hidden = 'webkitHidden';
      visibilityChange = 'webkitvisibilitychange';
    }
    this.documentHidden = hidden;
    this.visibilityChange = visibilityChange;
    document.addEventListener(visibilityChange, this.handleVisibilityChange, false);
  }

  init() {
    return new Promise((resolve, reject) => {
      this.loadAssets()
        .then((assets) => {
          AppProps.assets = assets;

          const { parentNode = document.body } = AppProps;

          this.loadData()
            .then((data) => {
              AppProps.data = this.filterData(data);

              this.webglController = new WebGLController(parentNode);
              this.webglController.initDataObjects(AppProps.data);
              this.webglController.transitionIn(1.5, 0.6);

              this.trackPageVisibility();

              resolve();
            })
            .catch((error) => {
              showFallback();
              reject(error);
            });
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  handleVisibilityChange() {
    if (document[this.documentHidden]) {
      EventManager.emit(EVENTS.PAUSE);
    } else {
      EventManager.emit(EVENTS.RESUME);
    }
  }

  get renderer() {
    if (this.webglController) return this.webglController.renderer;
    return null;
  }

  get canvas() {
    if (this.webglController) return this.webglController.renderer.domElement;
    return null;
  }

  dispose() {
    document.removeEventListener(this.visibilityChange, this.handleVisibilityChange);
    this.webglController.dispose();

    this.webglController = null;
    this.visibilityChange = null;
    this.documentHidden = null;

    Object.keys(AppProps).forEach((key) => {
      delete AppProps[key];
    });
  }
}
