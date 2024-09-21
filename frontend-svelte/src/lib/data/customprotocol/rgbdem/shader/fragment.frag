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
uniform int evolutionColorMap;
uniform int slopeColorMap;
uniform int aspectColorMap;
uniform float evolutionAlpha;
uniform float slopeAlpha;
uniform float shadowAlpha;
uniform float aspectAlpha;
uniform vec3 lightDirection;
in vec2 vTexCoord;
out vec4 fragColor;

#pragma glslify: jet = require("glsl-colormap/jet")
#pragma glslify: hsv = require("glsl-colormap/hsv")
#pragma glslify: hot = require("glsl-colormap/hot")
#pragma glslify: cool = require("glsl-colormap/cool")
#pragma glslify: spring = require("glsl-colormap/spring")
#pragma glslify: summer = require("glsl-colormap/summer")
#pragma glslify: autumn = require("glsl-colormap/autumn")
#pragma glslify: winter = require("glsl-colormap/winter")
#pragma glslify: bone = require("glsl-colormap/bone")
#pragma glslify: copper = require("glsl-colormap/copper")
#pragma glslify: greys = require("glsl-colormap/greys")
#pragma glslify: yignbu = require("glsl-colormap/yignbu")
#pragma glslify: greens = require("glsl-colormap/greens")
#pragma glslify: yiorrd = require("glsl-colormap/yiorrd")
#pragma glslify: bluered = require("glsl-colormap/bluered")
#pragma glslify: rdbu = require("glsl-colormap/rdbu")
#pragma glslify: picnic = require("glsl-colormap/picnic")
#pragma glslify: rainbow = require("glsl-colormap/rainbow")
#pragma glslify: portland = require("glsl-colormap/portland")
#pragma glslify: blackbody = require("glsl-colormap/blackbody")
#pragma glslify: earth = require("glsl-colormap/earth")
#pragma glslify: electric = require("glsl-colormap/electric")
#pragma glslify: alpha = require("glsl-colormap/alpha")
#pragma glslify: viridis = require("glsl-colormap/viridis")
#pragma glslify: inferno = require("glsl-colormap/inferno")
#pragma glslify: magma = require("glsl-colormap/magma")
#pragma glslify: plasma = require("glsl-colormap/plasma")
#pragma glslify: warm = require("glsl-colormap/warm")
#pragma glslify: rainbowSoft = require("glsl-colormap/rainbow-soft")
#pragma glslify: bathymetry = require("glsl-colormap/bathymetry")
#pragma glslify: cdom = require("glsl-colormap/cdom")
#pragma glslify: chlorophyll = require("glsl-colormap/chlorophyll")
#pragma glslify: density = require("glsl-colormap/density")
#pragma glslify: freesurfaceBlue = require("glsl-colormap/freesurface-blue")
#pragma glslify: freesurfaceRed = require("glsl-colormap/freesurface-red")
#pragma glslify: oxygen = require("glsl-colormap/oxygen")
#pragma glslify: par = require("glsl-colormap/par")
#pragma glslify: phase = require("glsl-colormap/phase")
#pragma glslify: salinity = require("glsl-colormap/salinity")
#pragma glslify: temperature = require("glsl-colormap/temperature")
#pragma glslify: turbidity = require("glsl-colormap/turbidity")
#pragma glslify: velocityBlue = require("glsl-colormap/velocity-blue")
#pragma glslify: velocityGreen = require("glsl-colormap/velocity-green")
#pragma glslify: cubehelix = require("glsl-colormap/cubehelix")

vec4 applyColorMap(int type, float value) {
    if (type == 1) return jet(value);
    else if (type == 2) return hsv(value);
    else if (type == 3) return hot(value);
    else if (type == 4) return cool(value);
    else if (type == 5) return spring(value);
    else if (type == 6) return summer(value);
    else if (type == 7) return autumn(value);
    else if (type == 8) return winter(value);
    else if (type == 9) return bone(value);
    else if (type == 10) return copper(value);
    else if (type == 11) return greys(value);
    else if (type == 12) return yignbu(value);
    else if (type == 13) return greens(value);
    else if (type == 14) return yiorrd(value);
    else if (type == 15) return bluered(value);
    else if (type == 16) return rdbu(value);
    else if (type == 17) return picnic(value);
    else if (type == 18) return rainbow(value);
    else if (type == 19) return portland(value);
    else if (type == 20) return blackbody(value);
    else if (type == 21) return earth(value);
    else if (type == 22) return electric(value);
    else if (type == 23) return alpha(value);
    else if (type == 24) return viridis(value);
    else if (type == 25) return inferno(value);
    else if (type == 26) return magma(value);
    else if (type == 27) return plasma(value);
    else if (type == 28) return warm(value);
    else if (type == 29) return rainbowSoft(value);
    else if (type == 30) return bathymetry(value);
    else if (type == 31) return cdom(value);
    else if (type == 32) return chlorophyll(value);
    else if (type == 33) return density(value);
    else if (type == 34) return freesurfaceBlue(value);
    else if (type == 35) return freesurfaceRed(value);
    else if (type == 36) return oxygen(value);
    else if (type == 37) return par(value);
    else if (type == 38) return phase(value);
    else if (type == 39) return salinity(value);
    else if (type == 40) return temperature(value);
    else if (type == 41) return turbidity(value);
    else if (type == 42) return velocityBlue(value);
    else if (type == 43) return velocityGreen(value);
    else if (type == 44) return cubehelix(value);
    else return vec4(1.0, 0.0, 0.0, 1.0); // デフォルト値（赤色）
}

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


    if (evolutionMode == 1) {
        vec4 terrainColor =   applyColorMap(evolutionColorMap, normalizedHeight);
        finalColor = mix(finalColor, terrainColor, evolutionAlpha);
    }

    if (slopeMode == 1) {
        float slope = calculateSlope(normal);
        float normalizedSlope = clamp(slope / 90.0, 0.0, 1.0);
        vec4 slopeColor = applyColorMap(slopeColorMap, normalizedSlope);
        finalColor = mix(finalColor, slopeColor, slopeAlpha);
    }

    if (aspectMode == 1) {
        float aspect = atan(normal.y, normal.x);
        float normalizedAspect = (aspect + 3.14159265359) / (2.0 * 3.14159265359);
        vec4 aspectColor = applyColorMap(aspectColorMap, normalizedAspect);
        finalColor = mix(finalColor, aspectColor, aspectAlpha);
    }
    bool otherModesActive = (evolutionMode == 1 || slopeMode == 1 || aspectMode == 1);

    if (shadowMode == 1) {
        // vec3 lightDir = normalize(vec3(0.5, 0.5, 1.0));
        float diffuse = max(dot(normal, lightDirection), 0.0);
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
        finalColor = color;
    }

    fragColor = finalColor;


}