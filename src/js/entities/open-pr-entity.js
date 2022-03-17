/* eslint-disable camelcase */
import {
    MeshBasicMaterial,
    InstancedMesh,
    Group,
    BufferGeometry,
    Float32BufferAttribute,
    Points,
    PointsMaterial,
    InstancedBufferAttribute,
    AdditiveBlending,
    Vector3,
    CylinderBufferGeometry,
    Color,
    BoxBufferGeometry,
  } from 'three/build/three.module';
  
  import spikeVert from '../../glsl/spike.vert';
  import spikeFrag from '../../glsl/spike.frag';
  import particleVert from '../../glsl/particle.vert';
  import particleFrag from '../../glsl/particle.frag';
  import { clamp, hasValidCoordinates, map } from '../utils/utils.js';
  import { polarToCartesian, vectorZero, cleanBufferAttributeArray, disposeHierarchy, disposeNode } from '../utils/three-utils.js';
  import { AppProps } from '../core/app-props.js';
  
  export default class OpenPrEntity {
    constructor(props) {
      this.props = props;
      this.init();
    }
  
    init() {
      const {
        maxAmount = 1000,
        data = [],
        radius = 1,
        camera,
        maxIndexDistance,
        visibleIndex,
        colors: { openPrColor, openPrParticleColor },
      } = this.props;
  
      const { pixelRatio, spikeRadius = 0.06 } = AppProps;
  
      this.mesh = new Group();
  
      const spikeIntersectMaterial = new MeshBasicMaterial({ color: 0x00ff00, visible: false });
      const spikeIntersectGeometry = new BoxBufferGeometry(0.75, 1, 0.75);                                      //立方体几何图形
      spikeIntersectGeometry.translate(0, 0.5, 0);
      spikeIntersectGeometry.rotateX(-Math.PI / 2);
      const spikeIntersects = new InstancedMesh(spikeIntersectGeometry, spikeIntersectMaterial, maxAmount);     //一次性创建1000个实例  尖峰顶点
      this.mesh.add(spikeIntersects);
  
      const spikeMaterial = new MeshBasicMaterial({     //构建尖峰材质
        color: openPrColor,                             //颜色
        transparent: true,
        opacity: 0.4,                                   //透明度
        alphaTest: 0.05,                                //alpha测试  透明度<=0.05 则舍弃片元
        blending: AdditiveBlending,
      });
  
      spikeMaterial.onBeforeCompile = (shader) => {
        shader.uniforms.cameraPosition = { value: camera.position };
        shader.uniforms.radius = { value: radius };
        shader.uniforms.visibleIndex = { value: visibleIndex };
        shader.uniforms.maxIndexDistance = { value: maxIndexDistance };
        shader.uniforms.highlightIndex = { value: -9999 };
        shader.vertexShader = spikeVert;
        shader.fragmentShader = spikeFrag;
  
        this.spikeUniforms = shader.uniforms;
      };
  
      const spikeIndices = [];
      const particleIndices = [];
      for (let i = 0; i < maxAmount; i++) {
        spikeIndices.push(i);
        particleIndices.push(i);
      }
  
      const spikeGeometry = new CylinderBufferGeometry(spikeRadius * pixelRatio, spikeRadius * pixelRatio, 1, 6, 1, false); //圆柱几何体
      spikeGeometry.setAttribute('index', new InstancedBufferAttribute(new Float32Array(spikeIndices), 1));         //每个尖峰都有个独立的index
      spikeGeometry.translate(0, 0.5, 0);
      spikeGeometry.rotateX(-Math.PI / 2);
      const spikes = new InstancedMesh(spikeGeometry, spikeMaterial, maxAmount);        //创建1000个尖峰实例
      this.mesh.add(spikes);
  
      const particleGeometry = new BufferGeometry();    //通过数据构建的几何图形
      const particlePositions = [];
      const particleColors = [];
      const baseColor = new Color(openPrParticleColor);
      const dummy = new Group();
      const densities = this.getDensities();
      const { densityValues, minDensity, maxDensity } = densities;
  
      let dIndex = 0;
      for (let i = 0; i < maxAmount; i++) {
        const item = data[i];
        const { gop } = item;
        // Casting longitude and latitude to numbers
        const geo_user_opened = { lon: +gop.lon, lat: +gop.lat };
  
        if (!hasValidCoordinates(geo_user_opened)) {
          continue;
        }
  
        // spikes
        polarToCartesian(geo_user_opened.lat, geo_user_opened.lon, radius, dummy.position);     //极坐标转成3D坐标
  
        const density = densityValues[dIndex++];
        dummy.scale.z = map(density, minDensity, maxDensity, radius * 0.05, radius * 0.2);      //
  
        dummy.lookAt(vectorZero);
        dummy.updateMatrix();
        spikes.setMatrixAt(i, dummy.matrix);
        spikeIntersects.setMatrixAt(i, dummy.matrix);
  
        // top of spike
        polarToCartesian(geo_user_opened.lat, geo_user_opened.lon, radius + dummy.scale.z + 0.25, dummy.position);
        particlePositions.push(dummy.position.x, dummy.position.y, dummy.position.z);           //粒子pos数组
        particleColors.push(baseColor.r, baseColor.g, baseColor.b);                             //粒子颜色数组
      }
  
      particleGeometry.setAttribute(                                                            //设置position,color,index属性
        'position',
        new Float32BufferAttribute(particlePositions, 3).onUpload(cleanBufferAttributeArray)
      );
  
      particleGeometry.setAttribute('color', new Float32BufferAttribute(particleColors, 3).onUpload(cleanBufferAttributeArray));
  
      particleGeometry.setAttribute('index', new Float32BufferAttribute(particleIndices, 1).onUpload(cleanBufferAttributeArray));
  
      const particleMaterial = new PointsMaterial({
        alphaTest: 0.05,
        size: 0.8,
        depthWrite: false,
      });
  
      particleMaterial.onBeforeCompile = (shader) => {
        shader.uniforms.cameraPosition = { value: camera.position };
        shader.uniforms.radius = { value: radius };
        shader.uniforms.visibleIndex = { value: visibleIndex };
        shader.uniforms.maxIndexDistance = { value: maxIndexDistance };
  
        shader.vertexShader = particleVert;
        shader.fragmentShader = particleFrag;
  
        this.particleUniforms = shader.uniforms;
      };
  
      const particles = new Points(particleGeometry, particleMaterial);
      this.mesh.add(particles);
  
      this.materials = [spikeMaterial, particleMaterial];
      this.spikes = spikes;
      this.spikeIntersects = spikeIntersects;
      this.particles = particles;
  
      this.spikes.renderOrder = 3;
      this.particles.renderOrder = 4;
    }
  
    /*
      获取密集度
    */
    getDensities() {
      const { data, maxAmount = 1000, radius } = this.props;
      const vec = new Vector3();
  
      // figure out densities
      const locations = [];
      const densities = [];
      for (let i = 0; i < maxAmount; i++) {
        const item = data[i];
        const { gop } = item;
        // Casting longitude and latitude to floats
        const geo_user_opened = { lon: +gop.lon, lat: +gop.lat };
        if (geo_user_opened && hasValidCoordinates(geo_user_opened)) {
          polarToCartesian(geo_user_opened.lat, geo_user_opened.lon, radius, vec);
          locations.push(new Vector3().copy(vec));
          densities.push(0);
        }
      }
  
      const minDist = 10;
      locations.forEach((l1, index1) => {
        locations.forEach((l2, index2) => {
          if (index1 !== index2 && l1.distanceTo(l2) <= minDist) {
            densities[index1]++;
          }
        });
      });
  
      let minDensity = 99999;
      let maxDensity = -1;
      densities.forEach((d) => {
        if (d < minDensity) minDensity = d;
        else if (d > maxDensity) maxDensity = d;
      });
  
      return { densityValues: densities, minDensity, maxDensity };
    }
  
    //设置高亮
    setHighlightIndex(index) {
      if (this.spikeUniforms && this.spikeUniforms.highlightIndex.value !== index) {    //当hightlightIndex = index时高亮即鼠标hover时
        this.spikeUniforms.highlightIndex.value = index;
      }
    }
  
    update(visibleIndex) {
      if (this.spikeUniforms && this.particleUniforms) {
        const { maxAmount, maxIndexDistance } = this.props;
  
        if (this.spikeUniforms) this.spikeUniforms.visibleIndex.value = visibleIndex;
        if (this.particleUniforms) this.particleUniforms.visibleIndex.value = visibleIndex;
  
        const start = clamp((visibleIndex - maxIndexDistance) | 0, 0, maxAmount);
        const count = (maxIndexDistance * 2) | 0;
        const finalCount = clamp(start + count, 0, maxAmount);
  
        this.spikes.count = finalCount;     //设置尖峰的数量
        this.particles.geometry.setDrawRange(start, count);   //绘制start到count这些点
      }
    }
  
    dispose() {
      if (this.mesh) disposeHierarchy(this.mesh, disposeNode);
      if (this.mesh && this.mesh.parent) this.mesh.parent.remove(this.mesh);
  
      this.props = null;
      this.mesh = null;
      this.spikeUniforms = null;
      this.particleUniforms = null;
      this.materials = null;
      this.spikes = null;
      this.particles = null;
    }
  }
  