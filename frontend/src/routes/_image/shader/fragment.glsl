#version 300 es

precision highp float;


uniform sampler2D u_textureBitmapR;
uniform sampler2D u_textureBitmapG;
uniform sampler2D u_textureBitmapB;

in vec2 v_tex_coord ;
out vec4 fragColor;




void main() {
    vec2 uv = v_tex_coord;

    float bitmapR = texture(u_textureBitmapR, uv).r;
    float bitmapG = texture(u_textureBitmapG, uv).r;
    float bitmapB = texture(u_textureBitmapB, uv).r;

    fragColor = vec4(bitmapR, bitmapG, bitmapB, 1.0);

}