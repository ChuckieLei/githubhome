export default `
#define GLSLIFY 1
#include <common>

uniform float visibleIndex;
uniform float maxIndexDistance;

attribute float index;

varying float vScale;
varying float vIndex;

#ifndef PI
#define PI 3.141592653589793
#endif

float sineInOut(float t) {
  return -0.5 * (cos(PI * t) - 1.0);
}

void main() {
	vIndex = index;

	vec3 pos = position;

	float scale = sineInOut(clamp(smoothstep(maxIndexDistance, 0.0, distance(index, visibleIndex)), 0., 1.));  //离visibleIndex越近越大
	pos.z *= scale;					//z在伸缩周期运动
	vScale = scale;

	vec3 transformed = vec3( pos );
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
}`;