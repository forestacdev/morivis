#version 300 es
precision highp float;
precision highp sampler2DArray;

uniform sampler2DArray u_texArray;
uniform sampler2D u_elevationMap;
uniform int u_bandIndex;
uniform float u_min;
uniform float u_max;


in vec2 v_tex_coord ;
out vec4 fragColor;

// カラーマップテクスチャから色を取得する関数
vec4 getColorFromMap(sampler2D map, float value) {
    return vec4(texture(map, vec2(value, 0.5)).rgb, 1.0);
}

void main() {
    vec2 uv = v_tex_coord;
	float value = texture(u_texArray, vec3(uv, u_bandIndex)).r;

	float normalized = clamp((value - u_min) / (u_max - u_min), 0.0, 1.0);
    vec4 value_color = getColorFromMap(u_elevationMap, normalized);


    fragColor = value_color; // グレースケールで出力

}


