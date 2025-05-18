#version 300 es

precision highp float;
precision highp sampler2DArray;

uniform sampler2DArray u_texArray;
uniform int u_redIndex;
uniform int u_greenIndex;
uniform int u_blueIndex;



in vec2 v_tex_coord ;
out vec4 fragColor;


void main() {
    vec2 uv = v_tex_coord;

    float r = texture(u_texArray, vec3(uv, u_redIndex)).r;
    float g = texture(u_texArray, vec3(uv, u_greenIndex)).r;
    float b = texture(u_texArray, vec3(uv, u_blueIndex)).r;
    fragColor = vec4(r, g, b, 1.0);

}