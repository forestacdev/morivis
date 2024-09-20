#version 300 es
precision mediump float;

uniform sampler2D heightMap;
in vec2 vTexCoord;
out vec4 fragColor;

#pragma glslify: jet = require("glsl-colormap/jet")


// 高さ変換関数
float convertToHeight(vec4 color) {
    float r = color.r * 255.0;
    float g = color.g * 255.0;
    float b = color.b * 255.0;

    float rgb = (r * 65536.0) + (g * 256.0) + b;
    float h = 0.0;
    if (rgb < 8388608.0) {
        h = rgb * 0.01;
    } else if (rgb > 8388608.0) {
        h = (rgb - 16777216.0) * 0.01;
    }
    return h;
}

void main() {
    vec2 uv = vTexCoord;
    vec4 color = texture(heightMap, uv);

    float height = convertToHeight(color);

    // 高さを0-1の範囲に正規化（例：-500mから8000mの範囲を想定）
    float normalizedHeight = (height + 500.0) / 8500.0;
    normalizedHeight = clamp(normalizedHeight, 0.0, 1.0);

    // カラーマップを適用
    vec4 terrainColor = jet(normalizedHeight);

    // フラグメントカラー
    fragColor = terrainColor;
}