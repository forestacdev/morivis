#version 300 es
precision highp float;
precision highp sampler2DArray;

// Terrarium エンコード済みバンドテクスチャ（配列）
uniform sampler2DArray u_terrarium_bands;
// カラーマップテクスチャ (256x1)
uniform sampler2D u_color_map;

// バンド選択
uniform int u_bandIndex;

// 表示範囲（CPU側で正規化済み: 0〜1）
uniform float u_min;
uniform float u_max;

// 4326→メルカトル再投影
uniform bool u_reproject4326;
uniform vec4 u_bbox_display;  // 表示側bbox [minLng, minLat, maxLng, maxLat]（クリップ済み）
uniform vec4 u_bbox_source;   // ソーステクスチャのbbox [minLng, minLat, maxLng, maxLat]（元の範囲）

in vec2 v_tex_coord;
out vec4 fragColor;

float R = 6378137.0;

float latToY(float lat) {
    return R * log(tan(radians(lat) * 0.5 + 3.14159265 / 4.0));
}

float yToLat(float y) {
    return degrees(2.0 * atan(exp(y / R)) - 3.14159265 / 2.0);
}

// メルカトルUV → 正距円筒UV
vec2 reprojectUV(vec2 uv) {
    if (!u_reproject4326) return uv;

    // 出力UV → メルカトル座標 → 経緯度
    float maxY = latToY(u_bbox_display.w);
    float minY = latToY(u_bbox_display.y);
    float y = mix(maxY, minY, uv.y);
    float lng = mix(u_bbox_display.x, u_bbox_display.z, uv.x);
    float lat = yToLat(y);

    // 経緯度 → ソーステクスチャのUV
    float u = (lng - u_bbox_source.x) / (u_bbox_source.z - u_bbox_source.x);
    float v = (u_bbox_source.w - lat) / (u_bbox_source.w - u_bbox_source.y);

    return vec2(u, v);
}

// 標準 Terrarium の標高値を復元しているのではなく、
// 独自に 0〜65535 へ正規化して保存した値を 0〜1 に戻している。
// ここで得られるのは実値ではなく、そのバンド内での相対値。
float decodeTerrariumNormalized(vec4 color) {
    vec3 rgb = color.rgb * 255.0;
    return (rgb.r * 256.0 + rgb.g + rgb.b / 256.0) / 65535.0;
}

void main() {
    vec2 uv = reprojectUV(v_tex_coord);
    vec4 encoded = texture(u_terrarium_bands, vec3(uv, u_bandIndex));

    // nodata チェック（alpha = 0）
    if (encoded.a == 0.0) {
        fragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }

    // 取り出すのは実値ではなく正規化値。
    // 実値の復元は行わず、そのまま表示レンジ比較とカラーマップ適用に使う。
    float decoded = decodeTerrariumNormalized(encoded);

    // u_min/u_max も CPU 側で同じ 0〜1 空間へ正規化済みなので、
    // shader 側では軽いレンジ切り出しだけで済む。
    float displayNorm = clamp((decoded - u_min) / (u_max - u_min), 0.0, 1.0);

    fragColor = vec4(texture(u_color_map, vec2(displayNorm, 0.5)).rgb, 1.0);
}
