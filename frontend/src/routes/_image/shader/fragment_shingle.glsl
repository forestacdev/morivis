#version 300 es

precision highp float;
precision highp sampler2DArray;

uniform sampler2DArray u_texArray;
uniform int u_bandIndex;


in vec2 v_tex_coord ;
out vec4 fragColor;


void main() {
    vec2 uv = v_tex_coord;
    fragColor = texture(u_texArray, vec3(uv, u_bandIndex));
}
