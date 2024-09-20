#version 300 es
precision mediump float;

uniform sampler2D heightMap;
in vec2 vTexCoord;
out vec4 fragColor;

#pragma glslify: rainbowSoft = require("glsl-colormap/rainbow-soft")

// 高さ変換関数
float convertToHeight(vec4 color) {
    float r = color.r * 255.0;
    float g = color.g * 255.0;
    float b = color.b * 255.0;

    return -10000.0 + ((r * 256.0 * 256.0 + g * 256.0 + b) * 0.1);
}

// 隣接するピクセルの高さ差を使って法線を計算する関数
vec3 calculateNormal(vec2 uv) {
    vec2 pixelSize = vec2(1.0) / 256.0;
    float heightL = convertToHeight(texture(heightMap, uv - vec2(pixelSize.x, 0.0)));
    float heightR = convertToHeight(texture(heightMap, uv + vec2(pixelSize.x, 0.0)));
    float heightD = convertToHeight(texture(heightMap, uv - vec2(0.0, pixelSize.y)));
    float heightU = convertToHeight(texture(heightMap, uv + vec2(0.0, pixelSize.y)));
    float heightC = convertToHeight(texture(heightMap, uv));

    vec3 normal = vec3(heightL - heightR, heightD - heightU, 1.0);
    return normalize(normal);
}

// 傾斜量を計算する関数
float calculateSlope(vec3 normal) {
    // 法線ベクトルのZ成分から傾斜角を計算
    float slope = acos(normal.z);
    // ラジアンから度に変換
    return degrees(slope);
}

void main() {
    vec2 uv = vTexCoord;
    vec4 color = texture(heightMap, uv);

    if (color.a == 0.0) {
        fragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }

    float height = convertToHeight(color);

   // 高さを0-1の範囲に正規化（0mから3500mの範囲）
    float normalizedHeight = height / 1000.0;
    normalizedHeight = clamp(normalizedHeight, 0.0, 1.0);

    vec3 normal = calculateNormal(uv);

    // 傾斜量を計算
    float slope = calculateSlope(normal);
    
    // 傾斜量を0-1の範囲に正規化（0度から90度の範囲を想定）
    float normalizedSlope = slope / 90.0;
    normalizedSlope = clamp(normalizedSlope, 0.0, 1.0);

    // 傾斜量をグレースケールで表現
    vec4 slopeColor = vec4(vec3(normalizedSlope), 1.0);

    // カラーマップを適用（高度または傾斜に基づいて）
    vec4 terrainColor = rainbowSoft(normalizedHeight);

    // フラグメントカラー（傾斜量を表示）
    fragColor = slopeColor;
    
    // 高度と傾斜を組み合わせた表示にする場合
    fragColor = mix(terrainColor, slopeColor, 0.5);
}