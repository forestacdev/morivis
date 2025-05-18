#version 300 es
precision highp float;

uniform sampler2D u_tex;
uniform float u_min;
uniform float u_max;

in vec2 v_tex_coord ;
out vec4 fragColor;

void main() {
    vec2 uv = v_tex_coord;
	float elevation = texture(u_tex, uv).r;
	float normalized = clamp((elevation - u_min) / (u_max - u_min), 0.0, 1.0);
	fragColor = vec4(vec3(normalized), 1.0); // グレースケールで出力
}
