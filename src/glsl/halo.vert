export default `
#define GLSLIFY 1
uniform vec3 viewVector;
uniform float c;
uniform float p;
varying float intensity;
varying float intensityA;
void main() 
{
  vec3 vNormal = normalize( normalMatrix * normal );
  vec3 vNormel = normalize( normalMatrix * viewVector );
  intensity = pow( c - dot(vNormal, vNormel), p );
  intensityA = pow( 0.63 - dot(vNormal, vNormel), p );
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;