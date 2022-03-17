import { Mesh, SphereBufferGeometry, Group, FrontSide, Vector3, Color, MeshStandardMaterial } from 'three/build/three.module';
import vert from '../../glsl/globe-standard.vert';
import frag from '../../glsl/globe-standard.frag';


export default class Globe {
  constructor(props) {
    this.props = props;
    this.init();
  }

  init() {
    const {
      radius,
      detail = 50,
      renderer,
      shadowPoint,
      highlightPoint,
      highlightColor,
      frontHighlightColor = 0x36427d,
      waterColor = 0x0d1533,
      landColorFront = 0xffffff,
      shadowDist,
      highlightDist,
      frontPoint,
    } = this.props;

    const geometry = new SphereBufferGeometry(radius, detail, detail);      //构建几何球体,radius为半径，detail为段数

    const materialFill = new MeshStandardMaterial({         //使用PBR物理材质
      color: waterColor,                                    //材质颜色使用深蓝色
      metalness: 0,                                         //金属度
      roughness: 0.9,                                       //粗糙度      
    });

    this.uniforms = [];

    materialFill.onBeforeCompile = (shader) => {            //渲染前uniforms赋值  
      shader.uniforms.shadowDist = { value: shadowDist };
      shader.uniforms.highlightDist = { value: highlightDist };
      shader.uniforms.shadowPoint = { value: new Vector3().copy(shadowPoint) };
      shader.uniforms.highlightPoint = { value: new Vector3().copy(highlightPoint) };
      shader.uniforms.frontPoint = { value: new Vector3().copy(frontPoint) };
      shader.uniforms.highlightColor = { value: new Color(highlightColor) };
      shader.uniforms.frontHighlightColor = { value: new Color(frontHighlightColor) };
      shader.vertexShader = vert;
      shader.fragmentShader = frag;
      this.uniforms.push(shader.uniforms);
    };

    materialFill.defines = {          //shander中定义变量
      USE_HIGHLIGHT: 1,
      USE_HIGHLIGHT_ALT: 1,
      USE_FRONT_HIGHLIGHT: 1,
      DITHERING: 1,
    };

    this.mesh = new Group();
    const meshFill = new Mesh(geometry, materialFill);
    meshFill.renderOrder = 1;
    this.mesh.add(meshFill);
    this.meshFill = meshFill;
    this.materials = [materialFill];
  }

  //设置阴影点
  setShadowPoint(point) {
    if (this.uniforms) {
      this.uniforms.forEach((u) => {
        u.shadowPoint.value.copy(point);
      });
    }
  }

  //设置高亮点
  setHighlightPoint(point) {
    // point.x = 100;
    // point.y = 100 ;
    if (this.uniforms) {
      this.uniforms.forEach((u) => {
        u.highlightPoint.value.copy(point);
      });
    }
  }

  //设置前点
  setFrontPoint(point) {
    if (this.uniforms) {
      this.uniforms.forEach((u) => {
        u.frontPoint.value.copy(point);
      });
    }
  }

  //设置阴影长度
  setShadowDist(value) {
    if (this.uniforms) {
      this.uniforms.forEach((u) => {
        u.shadowDist.value = value;
      });
    }
  }

  //设置高亮长度
  setHighlightDist(value) {
    // value = 1000;
    if (this.uniforms) {
      this.uniforms.forEach((u) => {
        u.highlightDist.value = value;
      });
    }
  }

  dispose() {
    this.mesh = null;
    this.materials = null;
    this.uniforms = null;
    this.meshFill = null;
  }
}
