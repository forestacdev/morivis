#version 300 es
precision highp float;

uniform sampler2D u_dem;
uniform float u_min;
uniform float u_max;

in vec2 v_tex_coord ;
out vec4 fragColor;

void main() {
	float elevation = texture(u_dem, v_tex_coord).r;
	float normalized = clamp((elevation - u_min) / (u_max - u_min), 0.0, 1.0);
	fragColor = vec4(vec3(normalized), 1.0); // グレースケールで出力
}
