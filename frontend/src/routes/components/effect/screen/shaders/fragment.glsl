#version 300 es
precision highp float;

in vec2 v_uv;
uniform float u_time;

out vec4 outColor;

void main() {
    vec3 color = vec3(0.5 + 0.5 * sin(u_time + v_uv.xyx * 10.0));
    outColor = vec4(color, 0.2); // アルファ付き
}