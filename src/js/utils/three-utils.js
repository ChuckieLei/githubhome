import { Matrix4, Mesh, Raycaster, Vector3 } from 'three/build/three.module';

export const vectorZero = new Vector3();
export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;
export const { abs } = Math;

export function degreesToRadians(degrees) {
  return degrees * DEG2RAD;
}

export function radiansToDegrees(radians) {
  return radians * RAD2DEG;
}

export function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

export function rotateAroundWorldAxisY(object, radians, matrix) {
  const rotWorldMatrix = matrix || new Matrix4();
  rotWorldMatrix.identity();
  rotWorldMatrix.makeRotationY(radians);
  rotWorldMatrix.multiply(object.matrix);
  object.matrix.copy(rotWorldMatrix);
  object.rotation.setFromRotationMatrix(object.matrix);
}

export function disposeNode(node) {
  if (node instanceof Mesh) {
    if (node.geometry) {
      node.geometry.dispose();
    }

    if (node.material) {
      if (node.material.map) node.material.map.dispose();
      if (node.material.lightMap) node.material.lightMap.dispose();
      if (node.material.bumpMap) node.material.bumpMap.dispose();
      if (node.material.normalMap) node.material.normalMap.dispose();
      if (node.material.specularMap) node.material.specularMap.dispose();
      if (node.material.envMap) node.material.envMap.dispose();
      if (node.material.emissiveMap) node.material.emissiveMap.dispose();
      if (node.material.metalnessMap) node.material.metalnessMap.dispose();
      if (node.material.roughnessMap) node.material.roughnessMap.dispose();

      node.material.dispose(); // disposes any programs associated with the material
    }
  }
}

export function disposeHierarchy(node, callback) {
  for (let i = node.children.length - 1; i >= 0; i--) {
    const child = node.children[i];
    disposeHierarchy(child, callback);

    if (typeof callback === 'function') {
      callback(child);
    }
  }
}

export function getMouseIntersection(mouse, camera, objects, raycaster, arrayTarget, recursive = false) {
  raycaster = raycaster || new Raycaster();       //new一条射线

  raycaster.setFromCamera(mouse, camera);         //射线定义为从相机鼠标定义一条线
  const intersections = raycaster.intersectObjects(objects, recursive, arrayTarget); //射线穿过的物体会被拾取到arrayTarget
  return intersections.length > 0 ? intersections[0] : null;
}

export function latLonMidPoint(lat1, lon1, lat2, lon2) {
  lat1 = degreesToRadians(lat1);                          //经纬度转成弧度
  lon1 = degreesToRadians(lon1);
  lat2 = degreesToRadians(lat2);
  lon2 = degreesToRadians(lon2);

  const dLon = lon2 - lon1;                               //dLon是经度差值
  const bX = Math.cos(lat2) * Math.cos(dLon);             //x轴上的分量差值
  const bY = Math.cos(lat2) * Math.sin(dLon);             //y轴上的分量差值
  const lat3 = Math.atan2(Math.sin(lat1) + Math.sin(lat2), Math.sqrt((Math.cos(lat1) + bX) * (Math.cos(lat1) + bX) + bY * bY));   //中间的经度，纬度
  const lon3 = lon1 + Math.atan2(bY, Math.cos(lat1) + bX);

  return [radiansToDegrees(lat3), radiansToDegrees(lon3)];
}

export function latLonMidPointMul(latlonArr){
  let x = 0,y = 0, z = 0;
  let lon,lat;
  for(var i = 0; i < latlonArr.length; i++){
    let latlon = latlonArr[i];
    lon = degreesToRadians(latlon.lon);
    lat = degreesToRadians(latlon.lat);

    x += Math.cos(lat) * Math.sin(lon);
    y += Math.cos(lat) * Math.cos(lon);
    z += Math.sin(lat);
  }

  x /= latlonArr.length;
  y /= latlonArr.length;
  z /= latlonArr.length;

  lon = radiansToDegrees(Math.atan2(x,y));
  lat = radiansToDegrees(Math.atan2(z,Math.sqrt(x*x + y*y)));
  return [lon, lat];
}

/**
 * Convert [lat,lon] polar coordinates to [x,y,z] cartesian coordinates
 * @param {Number} lon
 * @param {Number} lat
 * @param {Number} radius
 * @return {Vector3}
 */
export function polarToCartesian(lat, lon, radius, out) {     //根据球的参数方程来转化
  out = out || new Vector3();
  const phi = (90 - lat) * DEG2RAD;
  const theta = (lon + 180) * DEG2RAD;
  out.set(-(radius * Math.sin(phi) * Math.cos(theta)), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta));
  return out;
}

export function cleanBufferAttributeArray() {
  this.array = null;
}

export function takeScreenshot(renderer, scene, camera) {
  renderer.render(scene, camera);
  renderer.domElement.toBlob(
    function (blob) {
      const a = document.createElement('a');
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = 'canvas.png';
      a.click();
    },
    'image/png',
    1.0
  );
}
