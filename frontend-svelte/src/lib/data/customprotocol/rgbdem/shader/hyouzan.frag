precision mediump float;
uniform sampler2D image;
uniform vec2 unit;
uniform vec4 argv;
uniform float zoom;
const vec4 rgb2alt = vec4(256 * 256, 256 , 1, 0) * 256.0 * 0.01;
const mat3 conv_c = mat3(vec3(0,-1, 0),vec3(-1, 4,-1), vec3(0,-1, 0));
const mat3 conv_sx = mat3(vec3(-1, 0, 1),vec3(-2, 0, 2),vec3(-1, 0, 1));
const mat3 conv_sy = mat3(vec3(-1,-2,-1),vec3(0, 0, 0),vec3( 1, 2, 1));
const vec3 color_convex  = vec3(1.0,0.5,0.0);
const vec3 color_concave = vec3(0.0,0.0,0.5);
const vec3 color_flat    = vec3(0.0,0.0,0.0);
float conv(mat3 a, mat3 b){
  return dot(a[0],b[0]) + dot(a[1],b[1]) + dot(a[2],b[2]);
}
float alt(sampler2D i,vec2 p){
  return dot(texture2D(i, p), rgb2alt);
}
void main() {
  vec2 p = vec2(gl_FragCoord.x,1.0 / unit.y - gl_FragCoord.y);
  mat3 h;
  h[0][0] = alt(image, (p + vec2(-1,-1)) * unit);
  h[0][1] = alt(image, (p + vec2( 0,-1)) * unit);
  h[0][2] = alt(image, (p + vec2( 1,-1)) * unit);
  h[1][0] = alt(image, (p + vec2(-1, 0)) * unit);
  h[1][1] = alt(image, (p + vec2( 0, 0)) * unit);
  h[1][2] = alt(image, (p + vec2( 1, 0)) * unit);
  h[2][0] = alt(image, (p + vec2(-1, 1)) * unit);
  h[2][1] = alt(image, (p + vec2( 0, 1)) * unit);
  h[2][2] = alt(image, (p + vec2( 1, 1)) * unit);
  float z = 10.0 * exp2(14.0 - zoom);
  vec2 cs = h[1][1] > 4000.0 ? vec2(0) : clamp(vec2(
    conv(h,conv_c),
    length(vec2(conv(h , conv_sx),conv(h , conv_sy)))
  ) * vec2(argv[0] / z,argv[1] / z), -1.0 ,1.0);
  gl_FragColor = vec4(
    cs[0] > 0.0 ? mix(color_flat,color_convex,cs[0]) : mix(color_flat,color_concave,-cs[0]) ,
    cs[1]
  );
}