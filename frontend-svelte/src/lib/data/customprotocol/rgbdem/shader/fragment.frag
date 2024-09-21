#version 300 es
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D heightMap;
uniform int demType;
uniform int slopeMode;
uniform int evolutionMode;
uniform int shadowMode;
uniform int aspectMode;
in vec2 vTexCoord;
out vec4 fragColor;

#pragma glslify: rainbowSoft = require("glsl-colormap/rainbow-soft")
#pragma glslify: bluered = require("glsl-colormap/bluered")
#pragma glslify: jet = require("glsl-colormap/jet")

// 高さ変換関数
float convertToHeight(vec4 color) {
    float r = color.r * 255.0;
    float g = color.g * 255.0;
    float b = color.b * 255.0;
    // rgb
    if (demType == 1) {
  

        return -10000.0 + ((r * 256.0 * 256.0 + g * 256.0 + b) * 0.1);
        
    } else if (demType == 2) {
    // gsi
  

    float rgb = (r * 65536.0) + (g * 256.0) + b;
    float h = 0.0;
    if (rgb < 8388608.0) {
        h = rgb * 0.01;
    } else if (rgb > 8388608.0) {
        h = (rgb - 16777216.0) * 0.01;
    }
    return h;

    }
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
    vec3 normalmap = (normal + 1.0) / 2.0;

    vec4 finalColor = vec4(1.0);

    // 各モードの透過度を定義（0.0から1.0の範囲）
    float evolutionAlpha = 0.5; // 例: 50%の強さ
    float slopeAlpha = 0.5;     // 例: 70%の強さ
    float shadowAlpha = 0.5;    // 例: 60%の強さ
    float aspectAlpha = 0.5;    // 例: 50%の強さ

    if (evolutionMode == 1) {
        vec4 terrainColor = rainbowSoft(normalizedHeight);
        finalColor = mix(finalColor, terrainColor, evolutionAlpha);
    }

    if (slopeMode == 1) {
        float slope = calculateSlope(normal);
        float normalizedSlope = clamp(slope / 90.0, 0.0, 1.0);
        vec4 slopeColor = jet(normalizedSlope);
        finalColor = mix(finalColor, slopeColor, slopeAlpha);
    }

    if (aspectMode == 1) {
        float aspect = atan(normal.y, normal.x);
        float normalizedAspect = (aspect + 3.14159265359) / (2.0 * 3.14159265359);
        vec4 aspectColor = jet(normalizedAspect);
        finalColor = mix(finalColor, aspectColor, aspectAlpha);
    }
    bool otherModesActive = (evolutionMode == 1 || slopeMode == 1 || aspectMode == 1);

    if (shadowMode == 1) {
        vec3 lightDir = normalize(vec3(0.5, 0.5, 1.0));
        float diffuse = max(dot(normal, lightDir), 0.0);
        float ambient = 0.2;
        float shadowFactor = ambient + (1.0 - ambient) * diffuse;
        
        // shadowFactorを基に透明度を計算（明るいほど透明に）
        float shadowAlpha = 1.0 - shadowFactor;
        
        if (otherModesActive) {
        // 他のモードがアクティブな場合、RGBのみを変更
        vec3 shadowColor = vec3(0.0);
        finalColor.rgb = mix(finalColor.rgb, shadowColor, shadowAlpha * shadowAlpha);
        } else {
            // 他のモードがオフの場合、アルファ値も含めて完全に透明に
            finalColor = vec4(0.0, 0.0, 0.0, shadowAlpha);
        }
    }

    if (evolutionMode == 0 && slopeMode == 0 && shadowMode == 0 && aspectMode == 0) {
        finalColor = vec4(normalmap, 1.0);
    }

    fragColor = finalColor;


}