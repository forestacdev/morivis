#version 300 es
precision highp float;
precision highp sampler2DArray;

// Terrarium エンコード済みバンドテクスチャ（配列）
uniform sampler2DArray u_terrarium_bands;

// RGB バンドインデックス
uniform int u_redIndex;
uniform int u_greenIndex;
uniform int u_blueIndex;

// 各チャンネルの表示範囲（CPU側で正規化済み: 0〜1）
uniform float u_redMin;
uniform float u_redMax;
uniform float u_greenMin;
uniform float u_greenMax;
uniform float u_blueMin;
uniform float u_blueMax;

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

    float maxY = latToY(u_bbox_display.w);
    float minY = latToY(u_bbox_display.y);
    float y = mix(maxY, minY, uv.y);
    float lng = mix(u_bbox_display.x, u_bbox_display.z, uv.x);
    float lat = yToLat(y);

    float u = (lng - u_bbox_source.x) / (u_bbox_source.z - u_bbox_source.x);
    float v = (u_bbox_source.w - lat) / (u_bbox_source.w - u_bbox_source.y);

    return vec2(u, v);
}

// Terrarium デコード → 正規化値 (0〜1)
float decodeTerrariumNormalized(vec4 color) {
    vec3 rgb = color.rgb * 255.0;
    return (rgb.r * 256.0 + rgb.g + rgb.b / 256.0) / 65535.0;
}

// デコード → 表示正規化
float decodeAndNormalize(vec2 uv, int bandIndex, float dispMin, float dispMax) {
    vec4 encoded = texture(u_terrarium_bands, vec3(uv, bandIndex));
    if (encoded.a == 0.0) return 0.0;

    float decoded = decodeTerrariumNormalized(encoded);
    return clamp((decoded - dispMin) / (dispMax - dispMin), 0.0, 1.0);
}

void main() {
    vec2 uv = reprojectUV(v_tex_coord);

    // nodata チェック（代表バンドの alpha）
    vec4 redEncoded = texture(u_terrarium_bands, vec3(uv, u_redIndex));
    if (redEncoded.a == 0.0) {
        fragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }

    float r = decodeAndNormalize(uv, u_redIndex, u_redMin, u_redMax);
    float g = decodeAndNormalize(uv, u_greenIndex, u_greenMin, u_greenMax);
    float b = decodeAndNormalize(uv, u_blueIndex, u_blueMin, u_blueMax);

    fragColor = vec4(r, g, b, 1.0);
}
