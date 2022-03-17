export default `
#define GLSLIFY 1
uniform vec3 glowColor;
varying float intensity;
varying float intensityA;
void main()
{
  gl_FragColor = vec4( glowColor * intensity, 1.0 * intensityA );
}`;