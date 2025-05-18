#version 300 es

precision highp float;
precision highp sampler2DArray;

uniform sampler2DArray u_texArray;
uniform int u_redIndex;
uniform int u_greenIndex;
uniform int u_blueIndex;
uniform float u_min;
uniform float u_max;


in vec2 v_tex_coord ;
out vec4 fragColor;

void main() {
    vec2 uv = v_tex_coord;

    float r = texture(u_texArray, vec3(uv, u_redIndex)).r;
    float g = texture(u_texArray, vec3(uv, u_greenIndex)).r;
    float b = texture(u_texArray, vec3(uv, u_blueIndex)).r;

    float normalized_r = clamp((r - u_min) / (u_max - u_min), 0.0, 1.0);
    float normalized_g = clamp((g - u_min) / (u_max - u_min), 0.0, 1.0);
    float normalized_b = clamp((b - u_min) / (u_max - u_min), 0.0, 1.0);
    fragColor = vec4(normalized_r, normalized_g, normalized_b, 1.0);

}