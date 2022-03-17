import { TextureLoader } from 'three/build/three.module';

export const JSON_TYPES = {
  DATA: 0,
  GEOMETRY: 1,
  FONT: 2,
};

export default class Loader {
  constructor() {
    this.reset();
  }

  reset() {
    clearInterval(this.interval);
    this.loadInfo = {};
    this.assets = {};
  }

  load(manifest, progressCallback) {
    this.reset();
    this.progressCallback = progressCallback;

    return new Promise((resolve) => {
      if (!manifest.length) {
        resolve(null);
        return;
      }

      const promises = [];

      manifest.forEach((asset) => {
        if (!(Object.prototype.toString.call(asset.url) === '[object Array]')) {
          if (
            asset.url.indexOf('.png') > -1 ||
            asset.url.indexOf('.jpg') > -1 ||
            asset.url.indexOf('.jpeg') > -1 ||
            asset.url.indexOf('.gif') > -1
          ) {
            this.assets.textures = this.assets.textures || {};
            promises.push(this.loadTexture(asset));
          } else if (asset.url.indexOf('.json') > -1) {
            if (asset.type === JSON_TYPES.DATA) {
              this.assets.data = this.assets.data || {};
              promises.push(this.loadData(asset));
            }
          }
        }
      });

      this.interval = setInterval(this.update, 1000 / 30);

      Promise.all(promises).then(() => {
        resolve({ assets: this.assets, loader: this });
      });
    });
  }

  loadData(asset) {
    this.loadInfo[asset.id] = { loaded: 0, total: 0 };

    const xhr = new XMLHttpRequest();

    let hasError = false;

    return new Promise((resolve, reject) => {
      const onError = () => {
        hasError = true;
        this.assets.data[asset.id] = null;
        this.loadInfo[asset.id].loaded = this.loadInfo[asset.id].total = 1;
        reject(new Error('loadData error'));
      };

      xhr.addEventListener('progress', (e) => {
        this.loadInfo[asset.id].loaded = e.loaded;
        this.loadInfo[asset.id].total = e.total;
      });

      xhr.overrideMimeType('application/json');
      xhr.open('GET', asset.url, true);
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
          this.assets.data[asset.id] = JSON.parse(xhr.responseText);
          this.loadInfo[asset.id].loaded = this.loadInfo[asset.id].total;
          resolve(this.assets.data[asset.id]);
        } else if (xhr.status === 404 && !hasError) {
          onError();
        }
      };
      xhr.onerror = onError;
      xhr.send();
    });
  }

  loadTexture(asset) {
    const loader = new TextureLoader();
    this.loadInfo[asset.id] = { loaded: 0, total: 0 };

    return new Promise((resolve, reject) => {
      loader.load(
        asset.url,
        (texture) => {
          this.loadInfo[asset.id].loaded = this.loadInfo[asset.id].total;
          this.assets.textures[asset.id] = texture;
          resolve();
        },
        (xhr) => {
          this.loadInfo[asset.id].loaded = xhr.loaded;
          this.loadInfo[asset.id].total = xhr.total;
        },
        (error) => {
          reject(error);
        }
      );
    });
  }

  update() {
    if (typeof this.progressCallback === 'function') {
      let loaded = 0;
      let total = 0;

      for (const info in this.loadInfo) {
        if (this.loadInfo[info].loaded) {
          loaded += this.loadInfo[info].loaded;
        }
        if (this.loadInfo[info].total) {
          total += this.loadInfo[info].total;
        }
      }

      if (this.progressCallback) this.progressCallback(loaded, total);
    }
  }

  dispose() {
    clearInterval(this.interval);
    this.interval = null;
    this.loadInfo = null;
    this.assets = null;
    this.progressCallback = null;
  }
}

export async function getData(url = '') {
  // Default options are marked with *
  const response = await fetch(url, {
    method: 'GET',
    mode: 'no-cors',
  });
  if (response.status !== 200) {
    throw new Error(`WebGL Globe: Failed to load data.json (status: ${response.status})`);
  }
  return response.json();
}
