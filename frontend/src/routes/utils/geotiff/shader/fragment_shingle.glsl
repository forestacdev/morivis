#version 300 es
precision highp float;
precision highp sampler2DArray;

uniform sampler2DArray u_texArray;
uniform int u_bandIndex;
uniform float u_min;
uniform float u_max;


in vec2 v_tex_coord ;
out vec4 fragColor;

void main() {
    vec2 uv = v_tex_coord;
	float value = texture(u_texArray, vec3(uv, u_bandIndex)).r;
	float normalized = clamp((value - u_min) / (u_max - u_min), 0.0, 1.0);
	fragColor = vec4(vec3(normalized), 1.0); // グレースケールで出力
}


