import { Vector2, Matrix4, Vector3 } from 'three/build/three.module';
import { AppProps } from '../core/app-props.js';
import EventManager from '../managers/event-manager.js';
import { EVENTS, ROTATION_OFFSET } from '../core/constants.js';
import { rotateAroundWorldAxisY } from '../utils/three-utils.js';
import { clamp } from '../utils/utils.js';

export default class Controls {
  constructor(props) {
    this.props = props;
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleMouseOut = this.handleMouseOut.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.handlePause = this.handlePause.bind(this);
    this.handleResume = this.handleResume.bind(this);

    this.init();
  }

  init() {
    this.dragging = false;
    this.mouse = new Vector2(0.5, 0.5);
    this.lastMouse = new Vector2(0.5, 0.5);
    this.target = new Vector3(0, 0);
    this.matrix = new Matrix4();
    this.velocity = new Vector2();
    this.autoRotationSpeedScalar = 1;
    this.autoRotationSpeedScalarTarget = 1;
    this.addListeners();

    EventManager.on(EVENTS.PAUSE, this.handlePause);
    EventManager.on(EVENTS.RESUME, this.handleResume);
  }

  addListeners() {
    const { domElement } = this.props;
    const { isMobile } = AppProps;

    this.removeListeners();

    const eventOptions = {
      capture: false,
      passive: true
    }

    domElement.addEventListener('mousedown', this.handleMouseDown, eventOptions);
    domElement.addEventListener('mousemove', this.handleMouseMove, eventOptions);
    domElement.addEventListener('mouseup', this.handleMouseUp, eventOptions);
    domElement.addEventListener('mouseout', this.handleMouseOut, eventOptions);
    domElement.addEventListener('mouseleave', this.handleMouseOut, eventOptions);
    domElement.addEventListener('touchstart', this.handleTouchStart, eventOptions);
    domElement.addEventListener('touchmove', this.handleTouchMove, eventOptions);
    domElement.addEventListener('touchend', this.handleTouchEnd, eventOptions);
    domElement.addEventListener('touchcancel', this.handleTouchEnd, eventOptions);
  }

  removeListeners() {
    const { domElement } = this.props;
    const { isMobile } = AppProps;

    domElement.removeEventListener('mousedown', this.handleMouseDown);
    domElement.removeEventListener('mousemove', this.handleMouseMove);
    domElement.removeEventListener('mouseup', this.handleMouseUp);
    domElement.removeEventListener('mouseout', this.handleMouseOut);
    domElement.removeEventListener('mouseleave', this.handleMouseOut);
    domElement.removeEventListener('touchstart', this.handleTouchStart);
    domElement.removeEventListener('touchmove', this.handleTouchMove);
    domElement.removeEventListener('touchend', this.handleTouchEnd);
    domElement.removeEventListener('touchcancel', this.handleTouchEnd);
  }

  setMouse(e) {
    const { width, height } = AppProps.parentNode.getBoundingClientRect();
    this.mouse.x = (e.clientX / width) * 2 - 1;
    this.mouse.y = -(e.clientY / height) * 2 + 1;
  }

  setDragging(dragging) {
    this.dragging = dragging;
    const { setDraggingCallback } = this.props;
    if (setDraggingCallback && typeof setDraggingCallback === 'function') {
      setDraggingCallback(dragging);
    }
  }

  handlePause() {
    this.removeListeners();
  }

  handleResume() {
    this.addListeners();
  }

  handleMouseDown(e) {
    this.setMouse(e);
    this.setDragging(true);
  }

  handleMouseMove(e) {
    this.setMouse(e);
  }

  handleMouseUp(e) {
    this.setMouse(e);
    this.setDragging(false);
  }

  handleMouseOut() {
    this.setDragging(false);
  }

  handleTouchStart(e) {
    this.setMouse(e.changedTouches[0]);
    this.lastMouse.copy(this.mouse);
    this.setDragging(true);
  }

  handleTouchMove(e) {
    this.setMouse(e.changedTouches[0]);
  }

  handleTouchEnd(e) {
    this.setMouse(e.changedTouches[0]);
    this.setDragging(false);
  }

  update(delta = 0.01) {
    let deltaX = 0;
    let deltaY = 0;
    const { object, objectContainer, rotateSpeed, autoRotationSpeed, easing = 0.1, maxRotationX = 0.3 } = this.props;

    if (this.dragging) {
      deltaX = this.mouse.x - this.lastMouse.x;
      deltaY = this.mouse.y - this.lastMouse.y;
      this.target.y = clamp(this.target.y - deltaY, -maxRotationX, maxRotationX*0.6);
    }

    objectContainer.rotation.x += (this.target.y + ROTATION_OFFSET.x - objectContainer.rotation.x) * easing;

    this.target.x += (deltaX - this.target.x) * easing;
    rotateAroundWorldAxisY(object, this.target.x * rotateSpeed, this.matrix);

    // auto rotation
    if (!this.dragging) {
      rotateAroundWorldAxisY(object, delta * autoRotationSpeed * this.autoRotationSpeedScalar, this.matrix);
    }

    this.autoRotationSpeedScalar += (this.autoRotationSpeedScalarTarget - this.autoRotationSpeedScalar) * 0.05;

    this.lastMouse.copy(this.mouse);
    this.velocity.set(deltaX, deltaY);
  }

  dispose() {
    this.removeListeners();
    EventManager.off(EVENTS.PAUSE, this.handlePause);
    EventManager.off(EVENTS.RESUME, this.handleResume);

    this.dragging = null;
    this.mouse = null;
    this.lastMouse = null;
    this.target = null;
    this.matrix = null;
    this.velocity = null;
    this.autoRotationSpeedScalar = null;
    this.autoRotationSpeedScalarTarget = null;
  }
}
