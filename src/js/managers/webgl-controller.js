/* eslint-disable camelcase */
import {
    AdditiveBlending,
    AmbientLight,
    BackSide,
    CircleBufferGeometry,
    Clock,
    Color,
    CylinderBufferGeometry,
    DirectionalLight,
    Group,
    InstancedMesh,
    Mesh,
    MeshBasicMaterial,
    MeshStandardMaterial,
    Object3D,
    PerspectiveCamera,
    Raycaster,
    Scene,
    ShaderMaterial,
    SphereBufferGeometry,
    SpotLight,
    Vector2,
    Vector3,
    WebGLRenderer
  } from 'three/build/three.module';
  import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
  import {
    BASE_HEIGHT,
    CAMERA_FOV,
    CAMERA_NEAR,
    CAMERA_Z,
    COLORS,
    DATA_CONTAINER,
    EVENTS,
    GLOBE_CONTAINER,
    GLOBE_RADIUS,
    MAP_ALPHA_THRESHOLD,
    MAX_CAMERA_DISTANCE,
    POPUP_TYPES,
    RAYCAST_TRIGGER,
    RENDER_QUALITY,
    ROTATION_OFFSET,
    VISIBLE_DATA_COUNT,
    VISIBLE_INCREMENT_SPEED,
    WORLD_DOT_ROWS
  } from '../core/constants.js';
  import EventManager from './event-manager.js';
  import { AppProps } from '../core/app-props.js';
  import { takeScreenshot, getMouseIntersection, polarToCartesian, DEG2RAD, disposeNode } from '../utils/three-utils.js';
  import Globe from '../entities/globe.js';
  import Controls from '../io/controls.js';
  import OpenPrEntity from '../entities/open-pr-entity.js';
  import MergedPrEntity from '../entities/merged-pr-entity.js';
  import { showFallback } from '../managers/fallback.js';
  import DataInfo from '../ui/data-info.js';
  import haloVert from '../../glsl/halo.vert';
  import haloFrag from '../../glsl/halo.frag';
  
  export default class WebGLController {
    constructor(domContainer) {
      this.handleResize = this.handleResize.bind(this);
      this.handlePause = this.handlePause.bind(this);
      this.handleResume = this.handleResume.bind(this);
      this.handleMouseMove = this.handleMouseMove.bind(this);
      this.setDragging = this.setDragging.bind(this);
      this.update = this.update.bind(this);
      this.hasLoaded = false;
  
      this.initBase(domContainer || document.body);
      this.initScene();
      this.addListeners();
  
      EventManager.on(EVENTS.PAUSE, this.handlePause);
      EventManager.on(EVENTS.RESUME, this.handleResume);
    }
  
    initBase(domContainer) {
      // const { width, height, x, y } = AppProps.parentNode.getBoundingClientRect();
      const { width, height, x, y } = {width:900, height:900, x:0, y:0};
  
      this.parentNodeRect = { width, height, x, y};
      this.scene = new Scene();
      this.camera = new PerspectiveCamera(CAMERA_FOV, width / height, CAMERA_NEAR, MAX_CAMERA_DISTANCE);
      this.renderer = new WebGLRenderer({
        powerPreference: 'high-performance',
        alpha: true,
        preserveDrawingBuffer: false
      });
      this.then = Date.now() / 1000;  // time in seconds
      this.fpsWarnings = 0; // Accumulated warnings if we fail to maintain fps goal
      this.fpsWarningThreshold = 50; // If we fail to maintain the correct speed in 50 frames in a row, lower the quality
      this.fpsTarget = 60;
      this.fpsEmergencyThreshold = 12;
      this.fpsTargetSensitivity = 0.875; // Allow this margin of error, i.e. 60 * 0.875 -> 52,5
      this.fpsStorage = [];
      this.worldDotRows = WORLD_DOT_ROWS;
      this.worldDotSize = 0.095;
      this.renderQuality = 4;
      this.renderer.setPixelRatio(AppProps.pixelRatio || 1);
      this.renderer.setSize(width, height);
      domContainer.appendChild(this.renderer.domElement);
  
      this.renderer.domElement.classList.add('webgl-canvas');
      this.renderer.domElement.classList.add('js-globe-canvas');
  
      const ambientLight = new AmbientLight(0xffffff, 0.8);
      this.scene.add(ambientLight);
  
      this.parentContainer = new Group();
      this.parentContainer.name = 'parentContainer';
      let rotationOffset = ROTATION_OFFSET;
      const date = new Date();
      const timeZoneOffset = date.getTimezoneOffset() || 0;
      const timeZoneMaxOffset = 60*12;
      rotationOffset.y = ROTATION_OFFSET.y + Math.PI * (timeZoneOffset / timeZoneMaxOffset);
      this.parentContainer.rotation.copy(rotationOffset);
      this.scene.add(this.parentContainer);
  
      this.haloContainer = new Group();
      this.haloContainer.name = 'haloContainer';
      this.scene.add(this.haloContainer);
  
      this.container = new Group();
      this.container.name = 'container';
      this.parentContainer.add(this.container);
  
      this.camera.position.set(0, 0, CAMERA_Z);
      this.scene.add(this.camera);
      this.clock = new Clock();
      this.mouse = new Vector3(0, 0, 0.5);
      this.mouseScreenPos = new Vector2(-9999, -9999);
      this.raycaster = new Raycaster();
      this.raycaster.far = MAX_CAMERA_DISTANCE;
      this.paused = false;
      this.canvasOffset = {x: 0, y: 0};
      this.updateCanvasOffset();
      this.highlightMaterial = new MeshBasicMaterial({
        opacity: 1,
        transparent: false,
        color: COLORS.WHITE
      });
  
      this.handleResize();
      this.startUpdating();
      
    }
  
    initScene() {
      const {
        isMobile,
        globeRadius = GLOBE_RADIUS,
        assets: {
          textures: { globeDiffuse, globeAlpha },
        },
      } = AppProps;
  
      this.radius = globeRadius;
  
      this.light0 = new SpotLight(COLORS.LIGHT_BLUE, 12, 120, 0.3, 0, 1.1);
      this.light1 = new DirectionalLight(0xA9BFFF, 3);
      this.light3 = new SpotLight(COLORS.PINK, 5, 75, 0.5, 0, 1.25);
  
      this.light0.target = this.parentContainer;
      this.light1.target = this.parentContainer;
      this.light3.target = this.parentContainer;
      this.scene.add(this.light0, this.light1, this.light3);
  
      this.positionContainer();
  
      this.shadowPoint = new Vector3()
        .copy(this.parentContainer.position)
        .add(new Vector3(this.radius * 0.7, -this.radius * 0.3, this.radius));
  
      this.highlightPoint = new Vector3()
        .copy(this.parentContainer.position)
        .add(new Vector3(-this.radius * 1.5, -this.radius * 1.5, 0));
  
      this.frontPoint = new Vector3().copy(this.parentContainer.position).add(new Vector3(0, 0, this.radius));
  
      const globe = new Globe({             //地球
        radius: this.radius,
        detail: 55,
        renderer: this.renderer,
        shadowPoint: this.shadowPoint,
        shadowDist: this.radius * 1.5,
        highlightPoint: this.highlightPoint,
        highlightColor: 0x517966,
        highlightDist: 5,
        frontPoint: this.frontPoint,
        frontHighlightColor: 0x27367d,
        waterColor: 0x171634,
        landColorFront: COLORS.WHITE,
        landColorBack: COLORS.WHITE
      });
  
      this.container.add(globe.mesh);
      this.globe = globe;
  
      const haloGeometry = new SphereBufferGeometry(GLOBE_RADIUS, 45, 45);      //光环
      const haloMaterialBlue = new ShaderMaterial({                             //光环材质
        uniforms: {
          "c":   { type: "f", value: 0.7 },
          "p":   { type: "f", value: 15.0 },
          glowColor: { type: "c", value: new Color(COLORS.HALO_BLUE) },
          viewVector: { type: "v3", value: new Vector3(0, 0, CAMERA_Z) }
        },
        vertexShader: haloVert,
        fragmentShader: haloFrag,
        side: BackSide,
        blending: AdditiveBlending,
        transparent: true,
        dithering: true,
      });
  
      const haloUpperLeft = new Mesh(haloGeometry, haloMaterialBlue);
      haloUpperLeft.scale.multiplyScalar(1.15);
      haloUpperLeft.rotateX(Math.PI*0.03);
      haloUpperLeft.rotateY(Math.PI*0.03);
      haloUpperLeft.renderOrder = 3;
      this.haloContainer.add(haloUpperLeft);
  
      this.dragging = false;
      this.rotationSpeed = 0.05;                    //自转速度
      this.raycastIndex = 0;
      this.raycastTrigger = RAYCAST_TRIGGER;
      this.raycastTargets = [];
      this.intersectTests = [];
  
      this.controls = new Controls({
        object: this.container,
        objectContainer: this.parentContainer,
        domElement: this.renderer.domElement,
        setDraggingCallback: this.setDragging,
        rotateSpeed: isMobile ? 1.5 : 3,
        autoRotationSpeed: this.rotationSpeed,
        easing: 0.12,
        maxRotationX: 0.5,
        camera: this.camera,
      });
    }
  
    initDataObjects(data) {
      const colors = {
        openPrColor: COLORS.LIGHT_BLUE,
        openPrParticleColor: 0x5da5f9,
        mergedPrColor: COLORS.PINK,                 //默认曲线颜色为紫色
        mergedPrColorHighlight: COLORS.WHITE        //高亮曲线颜色为白色
      };
  
      const {
        isMobile,
        assets: {
          textures: { worldMap },
        },
      } = AppProps;
  
      this.buildWorldGeometry();        //创建世界地图
      this.addArcticCodeVault();        //存档标志
  
      this.maxAmount = data.length;
      this.maxIndexDistance = VISIBLE_DATA_COUNT;
      this.indexIncrementSpeed = VISIBLE_INCREMENT_SPEED; // this controls the speed at which the data increments
      this.visibleIndex = VISIBLE_DATA_COUNT; // this is the index for the middle of the visible data range
  
      this.openPrEntity = new OpenPrEntity({
        data,
        maxAmount: this.maxAmount,
        radius: this.radius,
        camera: this.camera,
        maxIndexDistance: this.maxIndexDistance,
        indexIncrementSpeed: this.indexIncrementSpeed,
        visibleIndex: this.visibleIndex,
        colors,
      });
  
      this.mergedPrEntity = new MergedPrEntity({
        data,
        maxAmount: this.maxAmount,
        radius: this.radius,
        camera: this.camera,
        maxIndexDistance: this.maxIndexDistance,
        visibleIndex: this.visibleIndex,
        colors,
        mouse: this.mouse,
      });
  
      const { width, height } = AppProps.parentNode.getBoundingClientRect();
      const containerScale = 1 * (BASE_HEIGHT / height);
      this.containerScale = containerScale;
  
      this.dataInfo = new DataInfo({
        parentSelector: DATA_CONTAINER,
        domElement: this.renderer.domElement,
        controls: this.controls,
      });
      this.dataItem = {};
  
      this.intersectTests.push(this.globe.meshFill);                  //地球mesh
      this.intersectTests.push(this.openPrEntity.spikeIntersects);    //伸出来的闪光点
      this.intersectTests.push(...this.mergedPrEntity.lineHitMeshes); //狐线
      this.intersects = [];
    }
  
    monitorFps() {
      if (this.renderQuality == 1) return; // No reason to continue monitoring if we're at the lowest quality tier
      const now = Date.now() / 1000;  // time in seconds
      const elapsedTime = now - this.then;
      this.then = now;
      const fps = parseInt(1 / elapsedTime + 0.5);
      this.fpsStorage.push(fps);
      if (this.fpsStorage.length > 10) this.fpsStorage.shift();
      const fpsSum = this.fpsStorage.reduce((accumulator, currentValue) => accumulator + currentValue);
      const fpsAverage = fpsSum / this.fpsStorage.length;
      if (fpsAverage < this.fpsTarget * this.fpsTargetSensitivity && this.fpsStorage.length > 9) {
        this.fpsWarnings++;
        if (this.fpsWarnings > this.fpsWarningThreshold) {
          this.renderQuality = Math.max(this.renderQuality - 1, 1);
          this.fpsWarnings = 0;
          this.updateRenderQuality();
          this.fpsStorage = [];
        }
      } else if (this.fpsStorage.length > 9 && fpsAverage < this.fpsEmergencyThreshold) {
        this.renderQuality = 1;
        this.initPerformanceEmergency();
      } else {
        this.fpsWarnings = 0;
      }
    }
  
    updateRenderQuality() {
      if (this.renderQuality == RENDER_QUALITY.REGULAR) this.initRegularQuality();
      else if (this.renderQuality == RENDER_QUALITY.MEDIUM) this.initMediumQuality();
      else if (this.renderQuality == RENDER_QUALITY.LOW) this.initLowQuality();
      else if (this.renderQuality == RENDER_QUALITY.LOWEST) this.initLowestQuality();
    }
  
    initRegularQuality() {
      this.renderer.setPixelRatio(AppProps.pixelRatio || 1);
      this.indexIncrementSpeed = VISIBLE_INCREMENT_SPEED;
      this.raycastTrigger = RAYCAST_TRIGGER;
    }
  
    initMediumQuality() {
      this.renderer.setPixelRatio(Math.min(AppProps.pixelRatio, 1.85));
      this.indexIncrementSpeed = VISIBLE_INCREMENT_SPEED - 2;
      this.raycastTrigger = RAYCAST_TRIGGER + 2;
    }
  
    initLowQuality() {
      this.renderer.setPixelRatio(Math.min(AppProps.pixelRatio, 1.5));
      this.indexIncrementSpeed = VISIBLE_INCREMENT_SPEED / 3 * 2;
      this.raycastTrigger = RAYCAST_TRIGGER + 4;
      this.worldDotRows = WORLD_DOT_ROWS - 20;
      this.worldDotSize = 0.1;
      this.resetWorldMap();
      this.buildWorldGeometry();
    }
  
    initLowestQuality() {
      this.renderer.setPixelRatio(1);
      this.indexIncrementSpeed = VISIBLE_INCREMENT_SPEED / 3;
      this.raycastTrigger = RAYCAST_TRIGGER + 6;
      this.worldDotRows = WORLD_DOT_ROWS - 60;
      this.worldDotSize = 0.1;
      this.resetWorldMap();
      this.buildWorldGeometry();
    }
  
    initPerformanceEmergency() {
      this.dispose();
      showFallback();
    }
  
    /*
      构建球体上的世界地图
    */
    buildWorldGeometry() {
      const { assets: { textures: { worldMap }, }, } = AppProps;
      const dummyDot = new Object3D();
      const imageData = this.getImageData(worldMap.image);
      const dotData = [];
      const dotResolutionX = 2; // how many dots per world unit along the X axis
      const rows = this.worldDotRows;
  
      for (let lat = -90; lat <= 90; lat += 180/rows) {         //纬度（-90，90）
        const segmentRadius = Math.cos(Math.abs(lat) * DEG2RAD) * GLOBE_RADIUS;   //半径
        const circumference = segmentRadius * Math.PI * 2;      //圆周长
        const dotsforRow = circumference * dotResolutionX;      //一行的点数=圆周长x2
        for (let x = 0; x < dotsforRow; x++) {                  
          const long = -180 + x*360/dotsforRow;                 //经度
          if (!this.visibilityForCoordinate(long, lat, imageData)) continue;  //检测该经纬度是否可见  
  
          const pos = polarToCartesian(lat, long, this.radius);  //极坐标转笛卡3D尔坐标
          dummyDot.position.set(pos.x, pos.y, pos.z);
          const lookAt = polarToCartesian(lat, long, this.radius + 5);
          dummyDot.lookAt(lookAt.x, lookAt.y, lookAt.z);
          dummyDot.updateMatrix();
          dotData.push(dummyDot.matrix.clone());  //得到三维点的矩阵
        }
      }
  
      const geometry = new CircleBufferGeometry(this.worldDotSize, 5);    //圆点
      const dotMaterial = new MeshStandardMaterial({ color: COLORS.LAND, metalness: 0, roughness: 0.9, transparent: true, alphaTest: 0.02 }); //物理材质
      dotMaterial.onBeforeCompile = function (shader) {
        const fragmentShaderBefore = 'gl_FragColor = vec4( outgoingLight, diffuseColor.a );'
        const fragmentShaderAfter = `
          gl_FragColor = vec4( outgoingLight, diffuseColor.a );
          if (gl_FragCoord.z > 0.51) {
            gl_FragColor.a = 1.0 + ( 0.51 - gl_FragCoord.z ) * 17.0;
          }
        `
        shader.fragmentShader = shader.fragmentShader.replace(fragmentShaderBefore, fragmentShaderAfter); //替换成成自定义的材质
      };
      const dotMesh = new InstancedMesh(geometry, dotMaterial, dotData.length);  //多实例渲染,提升性能
      for (let i = 0; i < dotData.length; i++) dotMesh.setMatrixAt(i, dotData[i]);
      dotMesh.renderOrder = 3;
      this.worldMesh = dotMesh;
      this.container.add(dotMesh);    //添加所有的有效区域点
    }
  
    resetWorldMap() {
      this.container.remove(this.worldMesh);
      disposeNode(this.worldMesh);
      this.dotMesh = null;
    }
  
    /*
      添加可跳转的旗帜
    */
    addArcticCodeVault() {
      const lat = 78.14;
      const long = 15.26;
      const height = 1.5;
      const radius = 0.075;
      const geometry = new CylinderBufferGeometry(radius, radius, height, 8);
      this.vaultMaterial = new MeshBasicMaterial({
        blending: AdditiveBlending,
        opacity: 0.90,
        transparent: true,
        color: 0x4199FF
      });
      this.vaultIsHighlighted = false;
  
      const pos = polarToCartesian(lat, long, this.radius);
      const lookAt = polarToCartesian(lat, long, this.radius + 5);
      const { basePath, imagePath } = AppProps;
      const path = `${basePath}${imagePath}flag.obj`;
      const loader = new OBJLoader();
  
      loader.load(path, (obj) => {
        obj.position.set(pos.x, pos.y, pos.z);
        obj.lookAt(lookAt.x, lookAt.y, lookAt.z);
        obj.rotateX(90 * DEG2RAD);
        obj.scale.set(0.1, 0.1, 0.1);
        obj.renderOrder = 3;
        for (const mesh of obj.children) {
          mesh.material = this.vaultMaterial;
          mesh.name = 'arcticCodeVault';
          this.arcticCodeVaultMesh = mesh;
          this.intersectTests.push(this.arcticCodeVaultMesh);
        }
        this.container.add(obj);
      });
    }
  
    highlightArcticCodeVault() {
      if (this.vaultIsHighlighted) return;
      this.arcticCodeVaultMesh.material = this.highlightMaterial;
      this.vaultIsHighlighted = true;
  
      // Show aurora
      const aurora = document.querySelector('.js-globe-aurora');
      if (aurora === null) return;
  
      aurora.play();
      aurora.hidden = false;
  
      // If an animation is already running, just reverse it to fade in
      const elAnimations = aurora.getAnimations();
      for (const animation of elAnimations) {
        animation.reverse();
        return;
      }
  
      const keyframesIn = [
        { opacity: 0, },
        { opacity: 1 }
      ];
      const options = { fill: 'both', duration: 1600, easing: 'ease-in-out' };
  
      aurora.animate(keyframesIn, options);
    }
  
    resetArcticCodeVaultHighlight() {
      if (!this.vaultIsHighlighted) return;
      this.arcticCodeVaultMesh.material = this.vaultMaterial;
      this.vaultIsHighlighted = false;
  
      // Hide aurora
      const aurora = document.querySelector('.js-globe-aurora');
      if (aurora === null) return;
      const elAnimations = aurora.getAnimations();
  
      // If an animation is already running, just reverse it to fade out
      const animations = aurora.getAnimations();
      for (const animation of elAnimations) {
        animation.reverse();
        return;
      }
  
      const keyframesIn = [
        { opacity: 1, },
        { opacity: 0 }
      ];
      const options = { fill: 'both', duration: 1600, easing: 'ease-in' };
  
      aurora.animate(keyframesIn, options);
      aurora.pause();
    }
  
    visibilityForCoordinate(long, lat, imageData) {
      const dataSlots = 4;                              //R、G、B、A 每个像素用4个1bytes值
      const dataRowCount = imageData.width * dataSlots; //行数据个数
      const x = parseInt((long + 180)/360 * imageData.width + 0.5);   //根据经度计算横坐标  (-180,180) => (0,360)
      const y = imageData.height - parseInt((lat + 90)/180 * imageData.height - 0.5); //纬度范围 (-90,90) => (0,180) 上面是0 所以用imageData.height来减
      const alphaDataSlot = parseInt(dataRowCount * (y - 1)  + x * dataSlots) + (dataSlots - 1);
  
      return imageData.data[alphaDataSlot] > MAP_ALPHA_THRESHOLD;     //该点在图片上的透明度大于阈值
    }
  
    getImageData(image) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.canvas.width = image.width;
      ctx.canvas.height = image.height;
      ctx.drawImage(image, 0, 0, image.width, image.height);
      return ctx.getImageData(0, 0, image.width, image.height);
    }
  
    addListeners() {
      const eventOptions = {
        capture: false,
        passive: true
      }
  
      window.addEventListener('resize', this.handleResize, eventOptions);
      window.addEventListener('orientationchange', this.handleResize, eventOptions);
  
      const visibilityObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting && !this.paused) {
            this.paused = true;
            EventManager.emit(EVENTS.PAUSE);
          } else if (entry.isIntersecting && this.paused) {
            this.paused = false;
            EventManager.emit(EVENTS.RESUME);
          }
        }
      });
      visibilityObserver.observe(this.renderer.domElement);
  
      this.handleClick = (e) => {
        if (this.dataItem === null || this.dataItem.url === null || this.shouldCancelClick(e)) return;
        window.open(this.dataItem.url, '_blank');
      }
      this.renderer.domElement.addEventListener('mouseup', this.handleClick, eventOptions);
  
      this.handleMouseDown = (e) => { this.resetInteractionIntention(e) }
      this.renderer.domElement.addEventListener('mousedown', this.handleMouseDown, eventOptions);
  
      this.handleTouchStart = (e) => {
        const event = e.changedTouches[0];
        this.handleMouseMove(event);
        this.resetInteractionIntention(event);
        e.preventDefault();
      }
      this.renderer.domElement.addEventListener('touchstart', this.handleTouchStart, {capture: false});
  
      this.handleTouchMove = (e) => {
        if (!this.shouldCancelClick(e.changedTouches[0])) return;
        this.mouse = {x: -9999, y: -9999};
        e.preventDefault();
      }
      this.renderer.domElement.addEventListener('touchmove', this.handleTouchMove, {capture: false});
      this.renderer.domElement.addEventListener('mousemove', this.handleMouseMove, eventOptions);
    }
  
    removeListeners() {
      window.removeEventListener('resize', this.handleResize);
      window.removeEventListener('orientationchange', this.handleResize);
      this.renderer.domElement.removeEventListener('mousemove', this.handleMouseMove);
      this.renderer.domElement.removeEventListener('mouseup', this.handleClick);
      this.renderer.domElement.removeEventListener('mousedown', this.handleMouseDown);
      this.renderer.domElement.removeEventListener('touchstart', this.handleTouchStart);
      this.renderer.domElement.removeEventListener('touchmove', this.handleTouchMove);
    }
  
    updateCanvasOffset() {
      const dataParent = document.querySelector(DATA_CONTAINER).getBoundingClientRect();
      const globeContainer = document.querySelector(GLOBE_CONTAINER).getBoundingClientRect();
      this.canvasOffset = {
        x: globeContainer.x - dataParent.x,
        y: globeContainer.y - dataParent.y
      }
    }
  
    resetInteractionIntention(event) {
      this.mouseDownPos = {x: event.clientX, y: event.clientY}
    }
  
    shouldCancelClick(event) {
      // If dragging has been executed for more than N pixels in X or Y, it's probably a dragging motion, not a tap/click
      const diffX = Math.abs(event.clientX - this.mouseDownPos.x);
      const diffY = Math.abs(event.clientY - this.mouseDownPos.y);
      const diffThreshold = 2;
      return diffY > diffThreshold || diffX > diffThreshold
    }
  
    positionContainer() {
      const { isMobile } = AppProps;
  
      const { height } = this.parentNodeRect;
      const containerScale = 1 * (BASE_HEIGHT / height);
      this.containerScale = containerScale;
  
      if (!isMobile) {
        this.parentContainer.scale.set(containerScale, containerScale, containerScale);
        this.parentContainer.position.set(0, 0, 0);
        this.haloContainer.scale.set(containerScale, containerScale, containerScale);
      } else {
        this.parentContainer.position.set(0, 0, 0);
      }
  
      this.haloContainer.position.set(0, 0, -10);
      this.positionLights(containerScale);
    }
  
    positionLights(containerScale = 1) {
      if (this.light0) {
        this.light0.position.set(this.parentContainer.position.x - this.radius * 2.5, 80, -40).multiplyScalar(containerScale);
  
        this.light0.distance = 120 * containerScale;
      }
  
      if (this.light1) {
        this.light1.position
          .set(this.parentContainer.position.x - 50, this.parentContainer.position.y + 30, 10)
          .multiplyScalar(containerScale);
      }
  
      if (this.light2) {
        this.light2.position.set(this.parentContainer.position.x - 25, 0, 100).multiplyScalar(containerScale);
        this.light2.distance = 150 * containerScale;
      }
  
      if (this.light3) {
        this.light3.position
          .set(this.parentContainer.position.x + this.radius, this.radius, this.radius * 2)
          .multiplyScalar(containerScale);
  
        this.light3.distance = 75 * containerScale;
      }
    }
  
    handlePause() {
      this.stopUpdating();
      this.clock.stop();
    }
  
    handleResume() {
      this.clock.start();
      this.startUpdating();
    }
  
    handleResize() {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => {
        const { width, height, x, y } = AppProps.parentNode.getBoundingClientRect();
        this.parentNodeRect = { width, height, x, y};
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
  
        this.renderer.setSize(width, height);
  
        this.positionContainer();
  
        const containerScale = 1 * (BASE_HEIGHT / height);
        const radius = this.radius * containerScale;
  
        this.shadowPoint.copy(this.parentContainer.position).add(new Vector3(radius * 0.7, -radius * 0.3, radius));
        this.globe.setShadowPoint(this.shadowPoint);
  
        this.highlightPoint.copy(this.parentContainer.position).add(new Vector3(-radius * 1.5, -radius * 1.5, 0));
        this.globe.setHighlightPoint(this.highlightPoint);
  
        this.frontPoint = new Vector3().copy(this.parentContainer.position).add(new Vector3(0, 0, radius));
        this.globe.setFrontPoint(this.frontPoint);
  
        this.globe.setShadowDist(radius * 1.5);
        this.globe.setHighlightDist(5 * containerScale);
        this.updateCanvasOffset();
      }, 150);
    }
  
    handleMouseMove(e) {
      const { width, height, x, y } = this.parentNodeRect;
      const mouseX = e.clientX - x;
      const mouseY = e.clientY - y;
  
      this.mouse.x = (mouseX / width) * 2 - 1;
      this.mouse.y = -(mouseY / height) * 2 + 1;
  
      this.mouseScreenPos.set(mouseX, mouseY);
    }
  
    startUpdating() {
      this.stopUpdating();
      this.update();
    }
  
    stopUpdating() {
      cancelAnimationFrame(this.rafID);
    }
  
    setDragging(value = true) {
      this.dragging = value;
    }
  
    setDataInfo(dataItem) {
      if (!this.dataInfo) return;
      if (this.dataItem == dataItem) return;
      this.dataItem = dataItem;
  
      const { uol, uml, l, type, body, header, nwo, pr, ma, oa } = dataItem;
      let time = ma || oa;
      if (time) {
        time = time.replace(' ', 'T');
        time = time.includes('Z') ? time : time.concat('-08:00');
        time = Date.parse(time)
      }
      if (nwo && pr) { this.dataItem.url = `https://github.com/${nwo}/pull/${pr}` }     //设置跳转地址

      this.dataInfo.setInfo({
        user_opened_location: uol,
        user_merged_location: uml,
        language: l,
        name_with_owner: nwo,
        pr_id: pr,
        time,
        type,
        body,
        header,
        url: this.dataItem.url
      });
    }
  
    testForDataIntersection() {
      const { mouse, raycaster, camera } = this;
  
      this.intersects.length = 0;
      getMouseIntersection(mouse, camera, this.intersectTests, raycaster, this.intersects);
  
      // if the first hit is the globe, remove all results to avoid backside being used
      if (this.intersects.length && this.intersects[0].object === this.globe.meshFill) {      //射线第一个hit到的是地球，那么就是就无效(应该碰到github点或github弧线)
        this.intersects.length = 0;
      }
    }
  
    transitionIn() {
      return new Promise(() => {
        this.container.add(this.openPrEntity.mesh);       //闪光点
        this.container.add(this.mergedPrEntity.mesh);     //射线
      });
    }
  
    handleUpdate() {
      this.monitorFps();
      if (this.clock === null) return;
      const delta = this.clock.getDelta();
      if (this.controls) this.controls.update(delta);
      this.visibleIndex += delta * this.indexIncrementSpeed;
  
      if (this.visibleIndex >= this.maxAmount - VISIBLE_DATA_COUNT) this.visibleIndex = VISIBLE_DATA_COUNT;
  
      if (this.openPrEntity) this.openPrEntity.update(this.visibleIndex);
      if (this.mergedPrEntity) this.mergedPrEntity.update(delta, this.visibleIndex);
  
      if (!this.dataInfo) {
        this.render();
        return;
      }
  
      const { raycaster, camera, mouseScreenPos } = this;
      const frameValid = this.raycastIndex % this.raycastTrigger === 0;     //10帧检测一次
      let found = false;
      let dataItem;
  
      if (frameValid) {
        this.testForDataIntersection();       //检测数据交互 结果存放于this.intersects
  
        if (this.intersects.length) {         //length>1 则鼠标与点或线相交
          const globeDistance = this.radius * this.containerScale;
  
          for (let i = 0; i < this.intersects.length && !found; i++) {
            const { instanceId, object } = this.intersects[i]; // vertex index
  
            if (object.name === 'lineMesh') {                         //弧线
              dataItem = this.setMergedPrEntityDataItem(object);
              found = true;
              break;
            } else if (object === this.openPrEntity.spikeIntersects && this.shouldShowOpenPrEntity(instanceId)) {   //尖峰点
              dataItem = this.setOpenPrEntityDataItem(instanceId);
              found = true;
              break;
            } else if (object.name === 'arcticCodeVault') {       //旗帜
              dataItem = {
               header: 'Arctic Code Vault',
               body: 'Svalbard • Cold storage of the work of 3,466,573 open source developers. For safe keeping.\nLearn more →',
               type: POPUP_TYPES.CUSTOM,
               url: 'https://archiveprogram.github.com'
              }
              this.highlightArcticCodeVault();
              found = true;
              break;
            }
          }
        }
  
        if (found && dataItem) {
          this.setDataInfo(dataItem);
          this.dataInfo.show();
        } else {
          this.dataInfo.hide();
          this.openPrEntity.setHighlightIndex(-9999);
          this.mergedPrEntity.resetHighlight();
          this.resetArcticCodeVaultHighlight();
          this.dataItem = null;
          if (AppProps.isMobile) this.mouse = { x: -9999, y: -9999 } // Don't let taps persist on the canvas
        }
      }
  
      if (this.dragging) {
        this.dataInfo.hide();
        this.openPrEntity.setHighlightIndex(-9999);
        this.mergedPrEntity.resetHighlight();
        this.resetArcticCodeVaultHighlight();
      }
  
      if (this.dataInfo.isVisible) this.dataInfo.update(mouseScreenPos, this.canvasOffset);
  
      this.raycastIndex++;
      if (this.raycastIndex >= this.raycastTrigger) this.raycastIndex = 0;
  
      this.render();
    }
  
    update() {
      this.handleUpdate();
      if (!this.hasLoaded) this.sceneDidLoad();
  
      this.rafID = requestAnimationFrame(this.update);
    }
  
    render() {
      this.renderer.render(this.scene, this.camera);
    }
  
    shouldShowMergedPrEntity(object, faceIndex) {
      const indexAttrib = object.geometry.attributes.index;
      const lineIndex = indexAttrib.array[faceIndex];
  
      return lineIndex >= this.visibleIndex - this.maxIndexDistance && lineIndex <= this.visibleIndex + this.maxIndexDistance;
    }
  
    sceneDidLoad() {
      this.hasLoaded = true;
      const placeholder = document.querySelector('.js-webgl-globe-loading');
      if (!placeholder) return;
  
      const keyframesIn = [
        { opacity: 0, transform: 'scale(0.8)' },
        { opacity: 1, transform: 'scale(1)' }
      ];
      const keyframesOut = [
        { opacity: 1, transform: 'scale(0.8)' },
        { opacity: 0, transform: 'scale(1)' }
      ];
      const options = { fill: 'both', duration: 600, easing: 'ease' };
  
      this.renderer.domElement.animate(keyframesIn, options);
      const placeHolderAnim = placeholder.animate(keyframesOut, options);
      placeHolderAnim.addEventListener('finish', () => {
        placeholder.remove();
      });
    }
  
    setMergedPrEntityDataItem(object) {
      this.mergedPrEntity.setHighlightObject(object);
      this.openPrEntity.setHighlightIndex(-9999);
  
      const dataItem = this.mergedPrEntity.props.data[parseInt(object.userData.dataIndex)];
      dataItem.type = POPUP_TYPES.PR_MERGED;
  
      return dataItem;
    }
  
    shouldShowOpenPrEntity(instanceId) {
      return instanceId >= this.visibleIndex - this.maxIndexDistance && instanceId <= this.visibleIndex + this.maxIndexDistance;
    }
  
    setOpenPrEntityDataItem(instanceId) {
      this.openPrEntity.setHighlightIndex(instanceId);
      this.mergedPrEntity.resetHighlight();
  
      const dataItem = this.openPrEntity.props.data[instanceId]
      dataItem.type = POPUP_TYPES.PR_OPENED;
  
      return dataItem;
    }
  
    dispose() {
      this.stopUpdating();
      this.removeListeners();
      EventManager.off(EVENTS.PAUSE, this.handlePause);
      EventManager.off(EVENTS.RESUME, this.handleResume);
  
      if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
  
      if (this.controls) this.controls.dispose();
      if (this.globe) this.globe.dispose();
      if (this.openPrEntity) this.openPrEntity.dispose();
      if (this.mergedPrEntity) this.mergedPrEntity.dispose();
      if (this.dataInfo) this.dataInfo.dispose();
  
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.parentContainer = null;
      this.container = null;
      this.clock = null;
      this.mouse = null;
      this.mouseScreenPos = null;
      this.raycaster = null;
      this.paused = null;
      this.radius = null;
      this.light0 = null;
      this.light1 = null;
      this.light2 = null;
      this.light3 = null;
      this.shadowPoint = null;
      this.highlightPoint = null;
      this.frontPoint = null;
      this.globe = null;
      this.dragging = null;
      this.rotationSpeed = null;
      this.raycastIndex = null;
      this.raycastTrigger = null;
      this.raycastTargets = null;
      this.intersectTests = null;
      this.controls = null;
      this.maxAmount = null;
      this.maxIndexDistance = null;
      this.indexIncrementSpeed = null;
      this.visibleIndex = null;
      this.openPrEntity = null;
    }
  }
  