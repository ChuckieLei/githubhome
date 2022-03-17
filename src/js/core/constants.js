import { Euler } from 'three/build/three.module';

export const MAX_CAMERA_DISTANCE = 260; // how far in world units the camera will render
export const CAMERA_NEAR = 170; // how far in world units the camera will render
export const VISIBLE_DATA_COUNT = 60; // how much data is visible at any given point
export const VISIBLE_INCREMENT_SPEED = 15; // how fast data incremenents
export const CAMERA_FOV = 20; // camera field of view
export const GLOBE_RADIUS = 25; // size of globe
export const CAMERA_Z = 220; // camera z position
export const ROTATION_OFFSET = new Euler(0.3, 4.6, 0.05); // globe rotation offset, start over GMT
export const BASE_HEIGHT = 850;
export const GLOBE_CONTAINER = '.js-webgl-globe';
export const DATA_CONTAINER = '.js-webgl-globe-data';
export const MAP_ALPHA_THRESHOLD = 90; // 0-255, higher number -> less likely that a dot will be drawn from that pixel
export const RAYCAST_TRIGGER = 10;
export const WORLD_DOT_ROWS = 200;

export const RENDER_QUALITY = {
  REGULAR: 4,
  MEDIUM: 3,
  LOW: 2,
  LOWEST: 1
};

export const POPUP_TYPES = {
  PR_OPENED: 'PR_OPENED',
  PR_MERGED: 'PR_MERGED',
  CUSTOM: 'CUSTOM'
};

export const COLORS = {
  WHITE: 0xffffff,
  BACKGROUND: 0x040d21,
  DARK_BLUE: 0x02112b,
  LIGHT_BLUE: 0x2188ff,
  LAND: 0x3A4494,
  PINK: 0xF46BBE,
  GREEN: 0x46b35f,
  ORANGE: 0xfb8532,
  YELLOW: 0xecff79,
  HALO_BLUE: 0x1C2462
};

export const EVENTS = {
  PAUSE: 'PAUSE',
  RESUME: 'RESUME',
  RESIZE: 'RESIZE',
  UPDATE: 'UPDATE',
  LOW_FPS: 'LOW_FPS',
};
