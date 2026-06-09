#version 300 es
precision highp float;
precision highp sampler2DArray;

// Terrarium エンコード済みバンドテクスチャ（配列）
uniform sampler2DArray u_terrarium_bands;
// カラーマップテクスチャ (256x1)
uniform sampler2D u_color_map;

// バンド選択
uniform int u_bandIndex;
uniform int u_derived_mode;

// 表示範囲（実値）
uniform float u_min;
uniform float u_max;
uniform float u_data_min;
uniform float u_data_max;
uniform vec2 u_texel_size;
uniform float u_ewres;
uniform float u_nsres;

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

float decodeBandValue(vec4 color) {
    return mix(u_data_min, u_data_max, decodeTerrariumNormalized(color));
}

float sampleBandValue(vec2 uv, vec2 offset) {
    vec4 encoded = texture(u_terrarium_bands, vec3(uv + offset, u_bandIndex));
    if (encoded.a == 0.0) {
        return 0.0;
    }
    return decodeBandValue(encoded);
}

float computeSlope(vec2 uv) {
    float h00 = sampleBandValue(uv, vec2(-u_texel_size.x, -u_texel_size.y));
    float h01 = sampleBandValue(uv, vec2(0.0, -u_texel_size.y));
    float h02 = sampleBandValue(uv, vec2(u_texel_size.x, -u_texel_size.y));
    float h10 = sampleBandValue(uv, vec2(-u_texel_size.x, 0.0));
    float h12 = sampleBandValue(uv, vec2(u_texel_size.x, 0.0));
    float h20 = sampleBandValue(uv, vec2(-u_texel_size.x, u_texel_size.y));
    float h21 = sampleBandValue(uv, vec2(0.0, u_texel_size.y));
    float h22 = sampleBandValue(uv, vec2(u_texel_size.x, u_texel_size.y));

    float dx = ((h00 + 2.0 * h10 + h20) - (h02 + 2.0 * h12 + h22)) / (8.0 * u_ewres);
    float dy = ((h20 + 2.0 * h21 + h22) - (h00 + 2.0 * h01 + h02)) / (8.0 * u_nsres);
    return degrees(atan(sqrt(dx * dx + dy * dy)));
}

float computeAspect(vec2 uv) {
    float h00 = sampleBandValue(uv, vec2(-u_texel_size.x, -u_texel_size.y));
    float h01 = sampleBandValue(uv, vec2(0.0, -u_texel_size.y));
    float h02 = sampleBandValue(uv, vec2(u_texel_size.x, -u_texel_size.y));
    float h10 = sampleBandValue(uv, vec2(-u_texel_size.x, 0.0));
    float h12 = sampleBandValue(uv, vec2(u_texel_size.x, 0.0));
    float h20 = sampleBandValue(uv, vec2(-u_texel_size.x, u_texel_size.y));
    float h21 = sampleBandValue(uv, vec2(0.0, u_texel_size.y));
    float h22 = sampleBandValue(uv, vec2(u_texel_size.x, u_texel_size.y));

    float dx = ((h00 + 2.0 * h10 + h20) - (h02 + 2.0 * h12 + h22)) / (8.0 * u_ewres);
    float dy = ((h20 + 2.0 * h21 + h22) - (h00 + 2.0 * h01 + h02)) / (8.0 * u_nsres);
    float aspect = degrees(atan(dy, dx));
    if (aspect < 0.0) {
        aspect += 360.0;
    }
    aspect = 90.0 - aspect;
    if (aspect < 0.0) {
        aspect += 360.0;
    }
    return aspect;
}

void main() {
    vec2 uv = reprojectUV(v_tex_coord);
    vec4 encoded = texture(u_terrarium_bands, vec3(uv, u_bandIndex));

    // nodata チェック（alpha = 0）
    if (encoded.a == 0.0) {
        fragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }

    float value = decodeBandValue(encoded);
    if (u_derived_mode == 1) {
        value = computeSlope(uv);
    } else if (u_derived_mode == 2) {
        value = computeAspect(uv);
    }

    float displayRange = max(u_max - u_min, 0.000001);
    float displayNorm = clamp((value - u_min) / displayRange, 0.0, 1.0);

    fragColor = vec4(texture(u_color_map, vec2(displayNorm, 0.5)).rgb, 1.0);
}
