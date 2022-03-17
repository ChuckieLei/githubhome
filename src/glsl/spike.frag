export default `
#define GLSLIFY 1
uniform vec3 diffuse;
uniform float opacity;

#include <common>

uniform float radius;
uniform float visibleIndex;
uniform float maxIndexDistance;
uniform float highlightIndex;

varying float vScale;
varying float vIndex;

void main() {
	if(vScale <= 0.01){			//scale<=0.01 则舍弃片元 不渲染
		discard;
		return;
	}

	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <alphatest_fragment>

	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	reflectedLight.indirectDiffuse += vec3( 1.0 );
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;

	vec3 rgb = outgoingLight.rgb;
	float alpha = diffuseColor.a;

	// highlight when mouse is over
	if(highlightIndex == vIndex){
		rgb = vec3(1.0);
		alpha = 1.0;
	}

	gl_FragColor = vec4( rgb, alpha );
}`;