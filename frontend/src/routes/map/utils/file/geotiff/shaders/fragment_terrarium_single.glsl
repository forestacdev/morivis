#version 300 es
precision highp float;
precision highp sampler2DArray;

// Terrarium エンコード済みバンドテクスチャ（配列）
uniform sampler2DArray u_terrarium_bands;
// カラーマップテクスチャ (256x1)
uniform sampler2D u_color_map;

// バンド選択
uniform int u_bandIndex;

// データ範囲（正規化エンコード時の min/max）
uniform float u_dataMin;
uniform float u_dataMax;

// 表示範囲（ユーザー指定の min/max）
uniform float u_min;
uniform float u_max;

in vec2 v_tex_coord;
out vec4 fragColor;

// Terrarium デコード → 正規化値 (0〜1)
float decodeTerrariumNormalized(vec4 color) {
    vec3 rgb = color.rgb * 255.0;
    return (rgb.r * 256.0 + rgb.g + rgb.b / 256.0) / 65535.0;
}

// カラーマップから色を取得
vec4 getColorFromMap(float value) {
    return vec4(texture(u_color_map, vec2(value, 0.5)).rgb, 1.0);
}

void main() {
    vec4 encoded = texture(u_terrarium_bands, vec3(v_tex_coord, u_bandIndex));

    // nodata チェック（alpha = 0）
    if (encoded.a == 0.0) {
        fragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }

    // Terrarium デコード → 正規化値 → 実値
    float normalized = decodeTerrariumNormalized(encoded);
    float realValue = normalized * (u_dataMax - u_dataMin) + u_dataMin;

    // 表示範囲で正規化
    float displayNorm = clamp((realValue - u_min) / (u_max - u_min), 0.0, 1.0);

    fragColor = getColorFromMap(displayNorm);
}
