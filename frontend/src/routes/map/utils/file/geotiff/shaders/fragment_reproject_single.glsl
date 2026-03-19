#version 300 es
precision highp float;
precision highp sampler2DArray;

// 元ラスターデータ（バンド配列）
uniform sampler2DArray u_texArray;
// カラーマップテクスチャ
uniform sampler2D u_elevationMap;
// UV再投影マップ（RG = ソース画像上のUV座標）
uniform sampler2D u_uvMap;

uniform int u_bandIndex;
uniform float u_min;
uniform float u_max;

in vec2 v_tex_coord;
out vec4 fragColor;

vec4 getColorFromMap(sampler2D map, float value) {
    return vec4(texture(map, vec2(value, 0.5)).rgb, 1.0);
}

void main() {
    // UVマップからソース画像上の座標を取得
    vec2 srcUV = texture(u_uvMap, v_tex_coord).rg;

    // 範囲外チェック（UVが0〜1の外ならソース画像に対応するピクセルがない）
    if (srcUV.x < 0.0 || srcUV.x > 1.0 || srcUV.y < 0.0 || srcUV.y > 1.0) {
        fragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }

    float value = texture(u_texArray, vec3(srcUV, u_bandIndex)).r;
    float normalized = clamp((value - u_min) / (u_max - u_min), 0.0, 1.0);
    vec4 value_color = getColorFromMap(u_elevationMap, normalized);

    fragColor = value_color;
}
