/* eslint-disable camelcase */
import {
    AdditiveBlending,
    CircleBufferGeometry,
    CubicBezierCurve3,
    Group,
    Mesh,
    MeshBasicMaterial,
    RingBufferGeometry,
    TubeBufferGeometry,
    Vector3
  } from 'three/build/three.module';
  
  import { polarToCartesian, latLonMidPointMul, disposeHierarchy, disposeNode } from '../utils/three-utils.js';
  import { hasValidCoordinates, map } from '../utils/utils.js';
  import { AppProps } from '../core/app-props.js';
  
  export default class MergedPrEntity {
    constructor(props) {
      this.props = props;
      this.init();
    }
  
    init() {
      const { data, radius = 1, camera, maxAmount = data.length, maxIndexDistance, visibleIndex, colors } = this.props;
  
      const { parentNode, lineWidth, pixelRatio } = AppProps;
  
      this.mesh = new Group();
      this.isAnimating = [];
      this.animatingLandingsOut = [];
      this.landings = [];
      this.lineMeshes = [];
      this.lineHitMeshes = [];
      this.highlightedMesh;
      this.colors = colors;
      this.landingGeo = new CircleBufferGeometry(0.35, 8);                                              //光圈
  
      this.TUBE_RADIUS_SEGMENTS = 3;
      this.HIT_DETAIL_FRACTION = 4; // Higher value -> lower accuracy of hit/hover area
      this.DATA_INCREMENT_SPEED = 1.5; // How fast new lines are added
      this.PAUSE_LENGTH_FACTOR = 2;
      this.MIN_PAUSE = 3000;
      const TUBE_RADIUS = 0.08;
      const TUBE_HIT_RADIUS = 0.6;
      const MIN_LINE_DETAIL = 20;
  
      this.visibleIndex = 0;
      this.lineAnimationSpeed = 600;
  
      const ctrl1 = new Vector3();
      const ctrl2 = new Vector3();
  
      this.tubeMaterial = new MeshBasicMaterial({
        blending: AdditiveBlending,
        opacity: 0.95,
        transparent: true,
        color: this.colors.mergedPrColor
      });
  
      this.highlightMaterial = new MeshBasicMaterial({
        opacity: 1,
        transparent: false,
        color: this.colors.mergedPrColorHighlight
      });
  
      this.hiddenMaterial = new MeshBasicMaterial({ visible: false });
  
  
      for (let i = 0; i < maxAmount; i++) {
        const { gop, gm } = data[i];
  
        // Casting longitude and latitude into numbers
        const geo_user_opened = { lat: +gop.lat, lon: +gop.lon };         //取open点
        const geo_user_merged = { lat: +gm.lat, lon: +gm.lon };           //取merge点
  
        if (!hasValidCoordinates(geo_user_opened) || !hasValidCoordinates(geo_user_merged)) {
          continue;
        }
  
        const vec1 = polarToCartesian(geo_user_opened.lat, geo_user_opened.lon, radius);
        const vec2 = polarToCartesian(geo_user_merged.lat, geo_user_merged.lon, radius);
  
        const dist = vec1.distanceTo(vec2);
  
        if (dist > 1.5) {                                                         //距离大于1.5才继续
          // arcs in outer orbit
          let scalar;
          if (dist > radius * 1.85) {                                             //距离和radius乘以一个系数比较，获取scale
            scalar = map(dist, 0, radius * 2, 1, 3.25);
          } else if (dist > radius * 1.4) {
            scalar = map(dist, 0, radius * 2, 1, 2.3);
          } else {
            scalar = map(dist, 0, radius * 2, 1, 1.5);
          }
  
          const midPoint = latLonMidPointMul([geo_user_opened, geo_user_merged]);  //获取中点
          const vecMid = polarToCartesian(midPoint[0], midPoint[1], radius * scalar);
  
          ctrl1.copy(vecMid);
          ctrl2.copy(vecMid);
  
          const t1 = map(dist, 10, 30, 0.2, 0.15);    //[10,30] => [0.2, 0.15]
          const t2 = map(dist, 10, 30, 0.8, 0.85);    //[10,30] => [0.8, 0.85]
          scalar = map(dist, 0, radius * 2, 1, 1.7);
  
          const tempCurve = new CubicBezierCurve3(vec1, ctrl1, ctrl2, vec2);       //建立临时三维贝塞尔曲线
          tempCurve.getPoint(t1, ctrl1);        //根据t1设置ctrl1点
          tempCurve.getPoint(t2, ctrl2);        //根据t2设置ctrl2点
          ctrl1.multiplyScalar(scalar);         //根据scale放大
          ctrl2.multiplyScalar(scalar);
  
          const curve = new CubicBezierCurve3(vec1, ctrl1, ctrl2, vec2);           //建立三维贝塞尔曲线
  
          // i is used to offset z to make sure that there's no z-fighting (objects
          // being rendered on the  same z-coordinate), which would cause flickering
          const landingPos = polarToCartesian(geo_user_merged.lat, geo_user_merged.lon, radius + i/10000);  //转笛卡尔坐标,i参与计算防止z-fighting
          const lookAt = polarToCartesian(geo_user_merged.lat, geo_user_merged.lon, radius+5);
          this.landings.push({pos: landingPos, lookAt: lookAt });
  
          const curveSegments = MIN_LINE_DETAIL + parseInt(curve.getLength());
          const geometry = new TubeBufferGeometry(curve, curveSegments, TUBE_RADIUS, this.TUBE_RADIUS_SEGMENTS, false);
          const hitGeometry = new TubeBufferGeometry(curve, parseInt(curveSegments/this.HIT_DETAIL_FRACTION), TUBE_HIT_RADIUS, this.TUBE_RADIUS_SEGMENTS, false);
          geometry.setDrawRange(0, 0);              
          hitGeometry.setDrawRange(0, 0);
          const lineMesh = new Mesh(geometry, this.tubeMaterial);             //曲线mesh
          const lineHitMesh = new Mesh(hitGeometry, this.hiddenMaterial);     //选中态的mesh 默认隐藏
          lineHitMesh.name = 'lineMesh';
          lineMesh.userData = { dataIndex: i };
          lineHitMesh.userData = { dataIndex: i, lineMeshIndex: this.lineMeshes.length };
          this.lineMeshes.push(lineMesh);
          this.lineHitMeshes.push(lineHitMesh);
        }
      }
  
      const { width, height } = parentNode.getBoundingClientRect();
    }
  
    //重置 替换为默认材质
    resetHighlight() {
      if (this.highlightedMesh == null) return;
      this.highlightedMesh.material = this.tubeMaterial;
      this.highlightedMesh = null;
    }
  
    //设置曲线高亮就是替换成高亮材质即可
    setHighlightObject(object) {
      const index = parseInt(object.userData.lineMeshIndex);
      const lineMesh = this.lineMeshes[index];
      if (lineMesh == this.highlightedMesh) return;
      lineMesh.material = this.highlightMaterial;
      this.resetHighlight();
      this.highlightedMesh = lineMesh;
    }
  
    update(delta = 0.01, visibleIndex) {
      let newVisibleIndex = parseInt(this.visibleIndex + delta * this.DATA_INCREMENT_SPEED);
      if (newVisibleIndex >= this.lineMeshes.length) {
        newVisibleIndex = 0;
        this.visibleIndex = 0;
      }
      if (newVisibleIndex > this.visibleIndex) this.isAnimating.push(this.animatedObjectForIndex(newVisibleIndex));     //新加入一条线
  
      let continueAnimating = [];
      let continueAnimatingLandingOut = [];
  
      for (const animated of this.isAnimating) {      //遍历animating数组(场景中存在一个或多个线段在做动画)
        const max = animated.line.geometry.index.count;
        const count = animated.line.geometry.drawRange.count + delta * this.lineAnimationSpeed;   //曲线根据速度向前移动一段距离
        let start = animated.line.geometry.drawRange.start + delta * this.lineAnimationSpeed;
  
        if (count >= max && start < max) this.animateLandingIn(animated);
  
        if (count >= max * this.PAUSE_LENGTH_FACTOR + this.MIN_PAUSE && start < max) {            //反向走
          // Pause animation of this line if it's being hovered
          if (animated.line == this.highlightedMesh) {        //鼠标hover的话 暂停
            continueAnimating.push(animated);
            continue;
          }
          start = this.TUBE_RADIUS_SEGMENTS * Math.ceil(start/this.TUBE_RADIUS_SEGMENTS);
          const startHit = this.TUBE_RADIUS_SEGMENTS * Math.ceil(start/this.HIT_DETAIL_FRACTION/this.TUBE_RADIUS_SEGMENTS);
          animated.line.geometry.setDrawRange(start, count);                                      //设置进度  
          animated.lineHit.geometry.setDrawRange(startHit, count/this.HIT_DETAIL_FRACTION);
          continueAnimating.push(animated);
        } else if (start < max) {                                                                 //正向走
          animated.line.geometry.setDrawRange(0, count);
          animated.lineHit.geometry.setDrawRange(0, count/this.HIT_DETAIL_FRACTION);
          continueAnimating.push(animated);
        } else {
          this.endAnimation(animated);                                                             //走完了 
        }
      }
  
      for (let i = 0; i < this.animatingLandingsOut.length; i++) {
        if (this.animateLandingOut(this.animatingLandingsOut[i])) {                                //应该结束就返回false,返回为true下次继续走相当于循环
          continueAnimatingLandingOut.push(this.animatingLandingsOut[i]);                          //不该结束放入continue数组
        }
      }
  
      this.isAnimating = continueAnimating;
      this.animatingLandingsOut = continueAnimatingLandingOut;
      this.visibleIndex = this.visibleIndex + delta * this.DATA_INCREMENT_SPEED;
    }
  
    /*
    结束了移除line
    */
    endAnimation(animated) {
      animated.line.geometry.setDrawRange(0, 0);
      animated.lineHit.geometry.setDrawRange(0, 0);
      this.mesh.remove(animated.line);
      this.mesh.remove(animated.lineHit);
      animated.line = null;
      animated.lineHit = null;
  
      this.animatingLandingsOut.push(animated);
    }
  
    //landingIn动画
    animateLandingIn(animated) {
      if (animated.dot.scale.x > 0.99) {
        if (animated.dotFade == null) return;
        animated.dotFade.material.opacity = 0;
        this.mesh.remove(animated.dotFade);
        disposeNode(animated.dotFade);
        animated.dotFade = null;
        return;
      }
      const scale = animated.dot.scale.x + (1 - animated.dot.scale.x) * 0.06; //光圈放大消失
      animated.dot.scale.set(scale, scale, 1);
  
      const scale2 = animated.dotFade.scale.x + (1 - animated.dotFade.scale.x) * 0.06;
      animated.dotFade.scale.set(scale2, scale2, 1);
      animated.dotFade.material.opacity = 1 - scale2;
    }
  
    //landingOut动画
    animateLandingOut(animated) {
      if (animated.dot.scale.x < 0.01) {
        this.mesh.remove(animated.dot);
        animated.dot = null;
        disposeNode(animated.dot);
  
        if (animated.dotFade != null) {
          this.mesh.remove(animated.dotFade);
          disposeNode(animated.dotFade);
          animated.dotFade = null;
        }
  
        return false; // Return false if animation should end
      }
  
      const scale = animated.dot.scale.x - animated.dot.scale.x * 0.15;     //否则继续缩小
      animated.dot.scale.set(scale, scale, 1);
  
      return true;
    }
  
    /*
      通过index获取对应的lineMesh
    */
    animatedObjectForIndex(index) {
      const line = this.lineMeshes[index];
      this.mesh.add(line);
  
      const lineHit = this.lineHitMeshes[index];
      this.mesh.add(lineHit);
  
      const landing = this.landingFromPositionData(this.landings[index]);
      this.mesh.add(landing);
  
      const dotFade = this.fadingLandingMeshFromMesh(landing);
      this.mesh.add(dotFade);
  
      return {
        line: line,
        lineHit: lineHit,
        dot: landing,
        dotFade: dotFade
      }
    }
  
    landingFromPositionData(data) {
      const landing = new Mesh(this.landingGeo, this.tubeMaterial);
      landing.position.set(data.pos.x, data.pos.y, data.pos.z);
      landing.lookAt(data.lookAt.x, data.lookAt.y, data.lookAt.z);
      landing.scale.set(0, 0, 1);
  
      return landing;
    }
  
    fadingLandingMeshFromMesh(mesh) {
      const newMesh = mesh.clone();
      newMesh.geometry = new RingBufferGeometry(1.55, 1.8, 16);
      newMesh.material = new MeshBasicMaterial({
        color: this.colors.mergedPrColor,
        blending: AdditiveBlending,
        transparent: true,
        opacity: 0,
        alphaTest: 0.02,
        visible: true
      });
      newMesh.scale.set(0, 0, 1);
      newMesh.renderOrder = 5;
  
      return newMesh;
    }
  
    dispose() {
      if (this.mesh) disposeHierarchy(this.mesh, disposeNode);
      if (this.mesh && this.mesh.parent) this.mesh.parent.remove(this.mesh);
  
      this.mesh = null;
    }
  }
  