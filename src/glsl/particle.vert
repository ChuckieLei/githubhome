export default `
#define GLSLIFY 1
uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

uniform float time;
uniform float visibleIndex;
uniform float maxIndexDistance;
uniform float speed;

attribute float index;
attribute vec3 curveStart;
attribute vec3 curveCtrl1;
attribute vec3 curveCtrl2;
attribute vec3 curveEnd;
attribute float timeOffset;

varying float vAlpha;

float quarticInOut(float t) {
  return t < 0.5
    ? +8.0 * pow(t, 4.0)
    : -8.0 * pow(t - 1.0, 4.0) + 1.0;
}

vec3 bezier(vec3 A, vec3 B, vec3 C, vec3 D, float t) {
  vec3 E = mix(A, B, t);
  vec3 F = mix(B, C, t);
  vec3 G = mix(C, D, t);

  vec3 H = mix(E, F, t);
  vec3 I = mix(F, G, t);

  vec3 P = mix(H, I, t);

  return P;
}

vec3 bezier(vec3 A, vec3 B, vec3 C, vec3 D, vec3 E, float t) {
  vec3 A1 = mix(A, B, t);
  vec3 B1 = mix(B, C, t);
  vec3 C1 = mix(C, D, t);
  vec3 D1 = mix(D, E, t);

  vec3 A2 = mix(A1, B1, t);
  vec3 B2 = mix(B1, C1, t);
  vec3 C2 = mix(C1, D1, t);

  vec3 A3 = mix(A2, B2, t);
  vec3 B3 = mix(B2, C2, t);
  
  vec3 P = mix(A3, B3, t);

  return P;
}

vec3 bezier(vec3 A, vec3 B, vec3 C, vec3 D, vec3 E, vec3 F, float t) {
  vec3 A1 = mix(A, B, t);
  vec3 B1 = mix(B, C, t);
  vec3 C1 = mix(C, D, t);
  vec3 D1 = mix(D, E, t);
  vec3 E1 = mix(E, F, t);

  vec3 A2 = mix(A1, B1, t);
  vec3 B2 = mix(B1, C1, t);
  vec3 C2 = mix(C1, D1, t);
  vec3 D2 = mix(D1, E1, t);

  vec3 A3 = mix(A2, B2, t);
  vec3 B3 = mix(B2, C2, t);
  vec3 C3 = mix(C2, D2, t);

  vec3 A4 = mix(A3, B3, t);
  vec3 B4 = mix(B3, C3, t);
  
  vec3 P = mix(A4, B4, t);

  return P;
}

vec3 bezier(vec3 A, vec3 B, vec3 C, vec3 D, vec3 E, vec3 F, vec3 G, float t) {
  vec3 A1 = mix(A, B, t);
  vec3 B1 = mix(B, C, t);
  vec3 C1 = mix(C, D, t);
  vec3 D1 = mix(D, E, t);
  vec3 E1 = mix(E, F, t);
  vec3 F1 = mix(F, G, t);

  vec3 A2 = mix(A1, B1, t);
  vec3 B2 = mix(B1, C1, t);
  vec3 C2 = mix(C1, D1, t);
  vec3 D2 = mix(D1, E1, t);
  vec3 E2 = mix(E1, F1, t);

  vec3 A3 = mix(A2, B2, t);
  vec3 B3 = mix(B2, C2, t);
  vec3 C3 = mix(C2, D2, t);
  vec3 D3 = mix(D2, E2, t);

  vec3 A4 = mix(A3, B3, t);
  vec3 B4 = mix(B3, C3, t);
  vec3 C4 = mix(C3, D3, t);

  vec3 A5 = mix(A4, B4, t);
  vec3 B5 = mix(B4, C4, t);
  
  vec3 P = mix(A5, B5, t);

  return P;
}

void main() {    
	#include <color_vertex>

	// animate along curve and loop
	float t = quarticInOut(fract((time * speed + timeOffset)));

	vec3 pos = position;

	#ifdef USE_CURVE
		pos =  bezier(curveStart, curveCtrl1, curveCtrl2, curveEnd, t);
	#endif

	vec3 transformed = vec3( pos );

	// visible near visibleIndex
	float dist = distance(index, visibleIndex);
	vAlpha = smoothstep(maxIndexDistance * 0.75, 0.0, dist); // show after lines draw in (* 0.75)

	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`;