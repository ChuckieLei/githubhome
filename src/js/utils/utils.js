export const { abs } = Math;

export function isMobile() {
  return /iPhone|iPad|iPod|Android|BlackBerry|BB10/i.test(navigator.userAgent);
}

export function createElement(type, classNames, content) {
  type = type || 'div';
  const el = document.createElement(type);
  if (classNames) {
    classNames.forEach((name) => {
      el.classList.add(name);
    });
  }
  if (content) el.innerHTML = content;
  return el;
}

export function normalize(value, min, max) {
  return (value - min) / (max - min) || 0;
}

export function lerp(norm, min, max) {
  return (max - min) * norm + min;
}

export function smoothstep(min, max, value) {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

export function map(value, sourceMin, sourceMax, destMin, destMax) {
  return lerp(normalize(value, sourceMin, sourceMax), destMin, destMax);
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

export function loop(value, min, max) {
  return value < min ? max : value > max ? min : value;
}

export function distance(p0, p1) {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function circleCollision(c0, c1) {
  return distance(c0, c1) <= c0.radius + c1.radius;
}

export function inRange(value, min, max) {
  return value >= Math.min(min, max) && value <= Math.max(min, max);
}

export function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

export function randomInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

export function cubicBezier(p0, p1, p2, p3, t, pFinal) {
  pFinal = pFinal || {};
  pFinal.x = Math.pow(1 - t, 3) * p0.x + Math.pow(1 - t, 2) * 3 * t * p1.x + (1 - t) * 3 * t * t * p2.x + t * t * t * p3.x;
  pFinal.y = Math.pow(1 - t, 3) * p0.y + Math.pow(1 - t, 2) * 3 * t * p1.y + (1 - t) * 3 * t * t * p2.y + t * t * t * p3.y;
  return pFinal;
}

export function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function isArray(arg) {
  return Object.prototype.toString.call(arg) === '[object Array]';
}

export function contains(source, tests) {
  for (let i = 0; i < tests.length; i++) {
    if (source.indexOf(tests[i]) > -1) {
      return true;
    }
  }

  return false;
}

export function hasWebGL() {
  if (window.WebGLRenderingContext) {
    const canvas = document.createElement('canvas');
    const names = ['webgl', 'experimental-webgl', 'moz-webgl', 'webkit-3d'];
    let context = false;

    for (let i = 0; i < 4; i++) {
      try {
        context = canvas.getContext(names[i]);
        if (context && typeof context.getParameter === 'function') {
          // WebGL is enabled
          return true;
        }
      } catch (e) {}
    }
    // WebGL is supported, but disabled
    return false;
  }
  // WebGL not supported
  return false;
}

export function setCursor(cursor, element) {
  element = element || document.body;

  if (element.style.cursor !== cursor) {
    element.style.cursor = cursor;
  }
}

export function chance(value, lessThan = true) {
  if (lessThan) {
    return Math.random() < value;
  }

  return Math.random() > value;
}

export function timestamp() {
  const date = new Date();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function hasValidCoordinates({ lat, lon }) {
  // eslint-disable-next-line no-restricted-globals
  const validLat = !isNaN(lat) && lat >= -90 && lat <= 90;
  // eslint-disable-next-line no-restricted-globals
  const validLon = !isNaN(lon) && lon >= -180 && lon <= 180;

  return validLat && validLon;
}
