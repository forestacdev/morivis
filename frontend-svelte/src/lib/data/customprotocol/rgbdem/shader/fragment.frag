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
uniform int curvatureMode;

uniform int evolutionColorMap;
uniform int slopeColorMap;
uniform int aspectColorMap;

uniform float evolutionAlpha;
uniform float slopeAlpha;
uniform float aspectAlpha;
uniform float curvatureAlpha;
uniform float shadowStrength;

uniform vec3 ridgeColor;
uniform vec3 valleyColor;

uniform float ridgeThreshold;
uniform float valleyThreshold;

uniform float maxHeight;
uniform float minHeight;
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

const mat3 conv_c = mat3(vec3(0,-1, 0),vec3(-1, 4,-1), vec3(0,-1, 0));
const mat3 conv_sx = mat3(vec3(-1, 0, 1),vec3(-2, 0, 2),vec3(-1, 0, 1));
const mat3 conv_sy = mat3(vec3(-1,-2,-1),vec3(0, 0, 0),vec3( 1, 2, 1));

float conv(mat3 a, mat3 b){
  return dot(a[0],b[0]) + dot(a[1],b[1]) + dot(a[2],b[2]);
}

struct TerrainData {
    vec3 normal;
    float curvature;
};

TerrainData calculateTerrainData(vec2 uv) {
    vec2 pixelSize = vec2(1.0) / 256.0;
    uv = clamp(uv, vec2(0.0), vec2(1.0) - pixelSize);

    TerrainData data;
    mat3 heightMatrix;

    // 高さマップデータの取得
    heightMatrix[0][0] = convertToHeight(texture(heightMap, uv + vec2(-pixelSize.x, -pixelSize.y)));
    heightMatrix[0][1] = convertToHeight(texture(heightMap, uv + vec2(0.0, -pixelSize.y)));
    heightMatrix[0][2] = convertToHeight(texture(heightMap, uv + vec2(pixelSize.x, -pixelSize.y)));
    heightMatrix[1][0] = convertToHeight(texture(heightMap, uv + vec2(-pixelSize.x, 0.0)));
    heightMatrix[1][1] = convertToHeight(texture(heightMap, uv));
    heightMatrix[1][2] = convertToHeight(texture(heightMap, uv + vec2(pixelSize.x, 0.0)));
    heightMatrix[2][0] = convertToHeight(texture(heightMap, uv + vec2(-pixelSize.x, pixelSize.y)));
    heightMatrix[2][1] = convertToHeight(texture(heightMap, uv + vec2(0.0, pixelSize.y)));
    heightMatrix[2][2] = convertToHeight(texture(heightMap, uv + vec2(pixelSize.x, pixelSize.y)));

    // 法線の計算
    data.normal.x = (heightMatrix[0][0] + heightMatrix[0][1] + heightMatrix[0][2]) - 
                    (heightMatrix[2][0] + heightMatrix[2][1] + heightMatrix[2][2]);
    data.normal.y = (heightMatrix[0][0] + heightMatrix[1][0] + heightMatrix[2][0]) - 
                    (heightMatrix[0][2] + heightMatrix[1][2] + heightMatrix[2][2]);
    data.normal.z = 2.0 * pixelSize.x * 256.0; // スケーリング係数
    data.normal = normalize(data.normal);

    // 曲率の計算
    data.curvature = conv(conv_c, heightMatrix);

    return data;
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

    TerrainData terrainData = calculateTerrainData(uv);
    vec3 normal = terrainData.normal;
    vec3 normalmap = (normal + 1.0) / 2.0;

    vec4 finalColor = vec4(1.0);


    if (evolutionMode == 1) {
        float height = convertToHeight(color);

        // 高さを0-1の範囲に正規化
        float normalizedHeight = height / maxHeight;
        normalizedHeight = clamp(normalizedHeight, 0.0, 1.0);
        vec4 terrainColor =  applyColorMap(evolutionColorMap, normalizedHeight);
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

      if (curvatureMode == 1) {
        float curvature = terrainData.curvature;
        float normalizedCurvature = (curvature + 1.0) / 2.0;
        normalizedCurvature = clamp(normalizedCurvature, 0.0, 1.0);

        vec4 curvatureColor;
        if (normalizedCurvature >= ridgeThreshold) {
            float intensity = (normalizedCurvature - ridgeThreshold) / (1.0 - ridgeThreshold);
            curvatureColor = vec4(ridgeColor, intensity);
        } else if (normalizedCurvature <= valleyThreshold) {
            float intensity = (valleyThreshold - normalizedCurvature) / valleyThreshold;
            curvatureColor = vec4(valleyColor, intensity);
        } else {
            curvatureColor = vec4(0.0, 0.0, 0.0, 0.0);
        }

        finalColor = mix(finalColor, curvatureColor, curvatureAlpha);
    }

    bool otherModesActive = (evolutionMode == 1 || slopeMode == 1 || aspectMode == 1 || curvatureMode == 1);

    if (shadowMode == 1) {
        float diffuse = max(dot(normal, lightDirection), 0.0);
        float ambient = 0.3;
        float shadowFactor = ambient + (1.0 - ambient) * diffuse;
        
        // shadowFactorを基に透明度を計算（明るいほど透明に）
        float shadowAlpha = 1.0 - shadowFactor;
        
        // shadowAlphaを考慮して影の強さを調整
        float adjustedShadowAlpha = shadowAlpha * shadowStrength;
        
        vec3 shadowColor = vec3(0.0, 0.0,0.0);
        if (otherModesActive) {
            // 他のモードがアクティブな場合、RGBとアルファ値を調整
          
            finalColor.rgb = mix(finalColor.rgb, shadowColor, adjustedShadowAlpha);
            finalColor.a = finalColor.a * (1.0 - adjustedShadowAlpha) + adjustedShadowAlpha;
        } else {
            // 他のモードがオフの場合、アルファ値も含めて完全に透明に
            finalColor = vec4(shadowColor, adjustedShadowAlpha);
        }
    }

    if (evolutionMode == 0 && slopeMode == 0 && shadowMode == 0 && aspectMode == 0 && curvatureMode == 0) {
        finalColor = color;
    }

    fragColor = finalColor;
}

// 曲率を計算する関数 ドラフト
// float calculateCurvature_draft(vec2 uv) {
//    vec2 pixelSize = vec2(1.0) / 256.0;
// //    uv = clamp(uv, vec2(0.0), vec2(1.0) - pixelSize);
// float z11 = convertToHeight(texture(heightMap, uv));
// float z21 = convertToHeight(texture(heightMap, uv + vec2(pixelSize.x, 0.0)));
// float z01 = convertToHeight(texture(heightMap, uv - vec2(pixelSize.x, 0.0)));
// float z12 = convertToHeight(texture(heightMap, uv + vec2(0.0, pixelSize.y)));
// float z10 = convertToHeight(texture(heightMap, uv - vec2(0.0, pixelSize.y)));
// float z22 = convertToHeight(texture(heightMap, uv + vec2(pixelSize.x, pixelSize.y)));
// float z00 = convertToHeight(texture(heightMap, uv - vec2(pixelSize.x, pixelSize.y)));
// float z02 = convertToHeight(texture(heightMap, uv + vec2(-pixelSize.x, pixelSize.y)));
// float z20 = convertToHeight(texture(heightMap, uv + vec2(pixelSize.x, -pixelSize.y)));

//      // 2次微分の計算
//     float dx = ((z21 + z22 + z20) - (z01 + z02 + z00)) / (6.0 * pixelSize.x);
//     float dy = ((z12 + z22 + z02) - (z10 + z20 + z00)) / (6.0 * pixelSize.y);
//     float dxx = (z21 + z01 - 2.0 * z11) / (pixelSize.x * pixelSize.x);
//     float dyy = (z12 + z10 - 2.0 * z11) / (pixelSize.y * pixelSize.y);
//     float dxy = (z22 + z00 - z20 - z02) / (4.0 * pixelSize.x * pixelSize.y);

//     // 平均曲率の計算
//     float H = ((1.0 + dx*dx) * dyy - 2.0*dx*dy*dxy + (1.0 + dy*dy) * dxx)
//               / (2.0 * pow(1.0 + dx*dx + dy*dy, 1.5));

//     return H;
// }


// 隣接するピクセルの高さ差を使って法線を計算する関数
// vec3 calculateNormal(vec2 uv) {
//     vec2 pixelSize = vec2(1.0) / 256.0;

//     float z11 = convertToHeight(texture(heightMap, uv));
//     float z21 = convertToHeight(texture(heightMap, uv + vec2(pixelSize.x, 0.0)));
//     float z01 = convertToHeight(texture(heightMap, uv - vec2(pixelSize.x, 0.0)));
//     float z12 = convertToHeight(texture(heightMap, uv + vec2(0.0, pixelSize.y)));
//     float z10 = convertToHeight(texture(heightMap, uv - vec2(0.0, pixelSize.y)));
//     float z22 = convertToHeight(texture(heightMap, uv + vec2(pixelSize.x, pixelSize.y)));
//     float z00 = convertToHeight(texture(heightMap, uv - vec2(pixelSize.x, pixelSize.y)));
//     float z02 = convertToHeight(texture(heightMap, uv + vec2(-pixelSize.x, pixelSize.y)));
//     float z20 = convertToHeight(texture(heightMap, uv + vec2(pixelSize.x, -pixelSize.y)));

//     vec3 normal;
//     normal.x = (z00 + z01 + z02) - (z20 + z21 + z22);
//     normal.y = (z00 + z10 + z20) - (z02 + z12 + z22);
//     normal.z = 2.0 * pixelSize.x * 256.0; // スケーリング係数

//     return normalize(normal);
// }





// float calculateCurvature(vec2 uv) {
//    vec2 pixelSize = vec2(1.0) / 256.0;
//    uv = clamp(uv, vec2(0.0), vec2(1.0) - pixelSize);
//     mat3 heightMatrix;
//     heightMatrix[0][0] = convertToHeight(texture(heightMap, uv + vec2(-pixelSize.x, -pixelSize.y)));
//     heightMatrix[0][1] = convertToHeight(texture(heightMap, uv + vec2(0.0, -pixelSize.y)));
//     heightMatrix[0][2] = convertToHeight(texture(heightMap, uv + vec2(pixelSize.x, -pixelSize.y)));
//     heightMatrix[1][0] = convertToHeight(texture(heightMap, uv + vec2(-pixelSize.x, 0.0)));
//     heightMatrix[1][1] = convertToHeight(texture(heightMap, uv));
//     heightMatrix[1][2] = convertToHeight(texture(heightMap, uv + vec2(pixelSize.x, 0.0)));
//     heightMatrix[2][0] = convertToHeight(texture(heightMap, uv + vec2(-pixelSize.x, pixelSize.y)));
//     heightMatrix[2][1] = convertToHeight(texture(heightMap, uv + vec2(0.0, pixelSize.y)));
//     heightMatrix[2][2] = convertToHeight(texture(heightMap, uv + vec2(pixelSize.x, pixelSize.y)));

//     float H = conv(conv_c, heightMatrix);
//     return H;
// }