const z={azimuth:315,altitude:45,shadowColor:"#000000",baseColor:"#ffffff",baseTransparent:!1},S=(t,n)=>typeof t!="string"?n:/^#[0-9a-f]{6}$/i.test(t)?t.toLowerCase():/^#[0-9a-f]{3}$/i.test(t)?"#"+[...t.slice(1)].map(e=>e+e).join("").toLowerCase():n,M=t=>{const{azimuth:n,altitude:e}={...z,...t};return{azimuth:Number.isFinite(n)?(n%360+360)%360:z.azimuth,altitude:Number.isFinite(e)?Math.min(90,Math.max(0,e)):z.altitude,shadowColor:S(t==null?void 0:t.shadowColor,z.shadowColor),baseColor:S(t==null?void 0:t.baseColor,z.baseColor),baseTransparent:(t==null?void 0:t.baseTransparent)===!0}},I=t=>{const{azimuth:n,altitude:e}=M(t),r=n*Math.PI/180,o=e*Math.PI/180;return[Math.cos(o)*Math.sin(r),Math.sin(o),-Math.cos(o)*Math.cos(r)]},G=t=>{const{shadowColor:n,baseColor:e,baseTransparent:r}=M(t),o=(a,i)=>[parseInt(a.slice(1,3),16)/255,parseInt(a.slice(3,5),16)/255,parseInt(a.slice(5,7),16)/255,i];return{shadow:o(n,1),base:o(e,r?0:1)}};let E=null;const R=()=>{if(E!==null)return E;E=!1;const t=5,e=new OffscreenCanvas(t,t).getContext("2d",{willReadFrequently:!0});if(!e)return!1;for(let o=0;o<t*t;o++){const a=o*4;e.fillStyle=`rgb(${a},${a+1},${a+2})`,e.fillRect(o%t,Math.floor(o/t),1,1)}const r=e.getImageData(0,0,t,t).data;for(let o=0;o<t*t*4;o++)if(o%4!==3&&r[o]!==o){E=!0;break}return E},D=async t=>{if(R())try{return t.transferToImageBitmap()}catch{}return await t.convertToBlob()};var F=`#version 300 es
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif


uniform sampler2D u_height_map_center;
uniform sampler2D u_height_map_left;
uniform sampler2D u_height_map_right;
uniform sampler2D u_height_map_top;
uniform sampler2D u_height_map_bottom;

uniform float u_dem_type; // 0.0:mapbox, 1.0:gsi, 2.0:terrarium
uniform float u_mode; // 0:default, 1:elevation, 2:slope, 3:aspect, 4:curvature, 5:shadow
uniform vec4 u_shadow_color;
uniform vec4 u_base_color;
uniform vec3 u_light_direction; // X=東、Y=上、Z=南

uniform sampler2D u_color_map;

// elevation
uniform float u_min_height;
uniform float u_max_height;

// slope
uniform float u_tile_z;
uniform float u_tile_y;
uniform float u_max_slope;
uniform float u_min_slope;
uniform float u_slope_auto_range;

// aspect
uniform float u_max_aspect;
uniform float u_min_aspect;

// tile size
uniform float u_tile_size;


in vec2 v_tex_coord ;
out vec4 fragColor;


// 高さ変換関数
float convertToHeight(vec4 color) {
    vec3 rgb = color.rgb * 255.0;

    if (u_dem_type == 0.0) {  // mapbox (TerrainRGB)

        return -10000.0 + dot(rgb, vec3(256.0 * 256.0, 256.0, 1.0)) * 0.1;

    } else if (u_dem_type == 1.0) {  // gsi (地理院標高タイル)
        // 地理院標高タイルの無効値チェック (R, G, B) = (128, 0, 0)
        if (rgb == vec3(128.0, 0.0, 0.0)) {
            return -9999.0;
        }

        float total = dot(rgb, vec3(65536.0, 256.0, 1.0));
        return mix(total, total - 16777216.0, step(8388608.0, total)) * 0.01;

    } else if (u_dem_type == 2.0) {  // terrarium (TerrariumRGB)
        // elevation = R*256 + G + B/256 - 32768
        // https://github.com/tilezen/joerd/blob/master/docs/formats.md
        return (rgb.r * 256.0 + rgb.g + rgb.b / 256.0) - 32768.0;
    }
}

// 陰影用。透明ピクセルと地理院の欠損値を標高として扱わない。
bool isShadowHeightValid(vec4 color) {
    return color.a > 0.0 && !(u_dem_type == 1.0 && convertToHeight(color) == -9999.0);
}

// 上下左右だけを参照するため、斜めの隣接タイルは不要。
vec4 sampleShadowHeight(vec2 uv) {
    if (uv.x < 0.0) return texture(u_height_map_left, uv + vec2(1.0, 0.0));
    if (uv.x > 1.0) return texture(u_height_map_right, uv - vec2(1.0, 0.0));
    if (uv.y < 0.0) return texture(u_height_map_top, uv + vec2(0.0, 1.0));
    if (uv.y > 1.0) return texture(u_height_map_bottom, uv - vec2(0.0, 1.0));
    return texture(u_height_map_center, uv);
}

// 中央差分。片側が欠損している場合は片側差分、両側欠損なら平坦とする。
float shadowGradient(vec4 before, vec4 after, float centerHeight, float cellSize) {
    float beforeValid = isShadowHeightValid(before) ? 1.0 : 0.0;
    float afterValid = isShadowHeightValid(after) ? 1.0 : 0.0;
    float beforeHeight = beforeValid > 0.0 ? convertToHeight(before) : centerHeight;
    float afterHeight = afterValid > 0.0 ? convertToHeight(after) : centerHeight;
    return (afterHeight - beforeHeight) / (max(1.0, beforeValid + afterValid) * cellSize);
}

// MapLibre hillshade_prepare の低ズーム補正を陰影の勾配に適用する。
// https://github.com/maplibre/maplibre-gl-js/blob/main/src/shaders/glsl/hillshade_prepare.fragment.glsl
// z15以上は1倍、z10は約2.8倍、z5は8倍、z0は64倍。
float shadowZoomExaggeration(float tileZoom) {
    float zoom = clamp(tileZoom, 0.0, 15.0);
    float factor = zoom < 2.0 ? 0.4 : (zoom < 4.5 ? 0.35 : 0.3);
    return exp2((15.0 - zoom) * factor);
}

// カラーマップテクスチャから色を取得する関数
vec4 getColorFromMap(sampler2D map, float value) {
    return vec4(texture(map, vec2(value, 0.5)).rgb, 1.0);
}



// タイルのY座標とuv座標から緯度(ラジアン)を取得する関数
float getLatitudeFromTileUV(float tileY, float uv_y, float zoom) {
    float n = 3.141592653589793 * (1.0 - 2.0 * ((tileY + uv_y) / pow(2.0, zoom)));
    return degrees(atan(sinh(n)));
}

// 地球の周囲長を基に、ズームレベルに応じた解像度を計算
float getResolution(float zoom) {
    return 40075016.68557849 / (u_tile_size * pow(2.0, float(zoom)));
}

// 緯度に応じたピクセルあたりの東西方向の地上解像度を計算
float getEwRes(float zoom, float latitude_deg) {
    return getResolution(zoom) * cos(radians(latitude_deg));
}
// 傾斜量を計算する関数 Horn法
float computeSlopeHorn(mat3 h, float ewres, float nsres, float scale, bool asDegrees) {

    // 無効値チェック（-9999.0 が1つでも含まれていたらスキップ）
    for (int i = 0; i < 3; i++) {
        for (int j = 0; j < 3; j++) {
            if (h[i][j] == -9999.0) {
                return -1.0;
            }
        }
    }

    float dx = (
        (h[0][0] + 2.0 * h[1][0] + h[2][0]) -
        (h[0][2] + 2.0 * h[1][2] + h[2][2])
    ) / (8.0 * ewres);

    float dy = (
        (h[2][0] + 2.0 * h[2][1] + h[2][2]) -
        (h[0][0] + 2.0 * h[0][1] + h[0][2])
    ) / (8.0 * nsres);

    float grad = sqrt(dx * dx + dy * dy);

    if (asDegrees) {
        return degrees(atan(grad / scale));
    } else {
        return 100.0 * grad / scale;
    }
}

// 3色グラデーション（min→mid→max）
vec3 colorRamp3(float value, float minVal, float maxVal, vec3 minColor, vec3 midColor, vec3 maxColor) {
    float t = clamp((value - minVal) / (maxVal - minVal), 0.0, 1.0);
    if (t < 0.5) {
        return mix(minColor, midColor, t * 2.0);
    } else {
        return mix(midColor, maxColor, (t - 0.5) * 2.0);
    }
}

// 傾斜方位を計算する関数
float computeAspectHorn(mat3 h, float ewres, float nsres) {
    // 無効値チェック
    for (int i = 0; i < 3; i++) {
        for (int j = 0; j < 3; j++) {
            if (h[i][j] == -9999.0) {
                return -9999.0; // 無効値を返す
            }
        }
    }

    // Horn法による勾配の計算
    float dx = (
        (h[0][0] + 2.0 * h[1][0] + h[2][0]) -
        (h[0][2] + 2.0 * h[1][2] + h[2][2])
    ) / (8.0 * ewres);

    float dy = (
        (h[2][0] + 2.0 * h[2][1] + h[2][2]) -
        (h[0][0] + 2.0 * h[0][1] + h[0][2])
    ) / (8.0 * nsres);

    // 傾斜方位を計算（atan2を使用）
    float aspect_rad = atan(dy, dx);
    
    // ラジアンから度に変換
    float aspect_deg = degrees(aspect_rad);
    
    // 0-360度の範囲に正規化
    if (aspect_deg < 0.0) {
        aspect_deg += 360.0;
    }
    
    // 地理的な方位に変換（北を0度とする）
    aspect_deg = 90.0 - aspect_deg;
    if (aspect_deg < 0.0) {
        aspect_deg += 360.0;
    }
    
    return aspect_deg;
}


mat3 calculateTerrainData(vec2 uv, float center_h) {


    // 9マスピクセルのインデックス番号
    // ----------------------------
    // | [0][0] | [0][1] | [0][2] |
    // ----------------------------
    // | [1][0] | [1][1] | [1][2] |
    // ----------------------------
    // | [2][0] | [2][1] | [2][2] |
    // ----------------------------

    // height_mapの隣接タイル
    // ----------------------------
    // |        | top    |        |
    // ----------------------------
    // | left   | center | right  |
    // ----------------------------
    // |        | bottom |        |
    // ----------------------------

    vec2 pixel_size = vec2(1.0) / u_tile_size;
    mat3 _h_mat = mat3(0.0);


    // 端の場合は隣接テクスチャからサンプル
    // 左上
    _h_mat[0][0] = convertToHeight(
        (uv.x <= pixel_size.x && uv.y <= pixel_size.y) ? texture(u_height_map_left, uv + vec2(1.0 - pixel_size.x, 1.0 - pixel_size.y)) :
        (uv.y <= pixel_size.y) ? texture(u_height_map_top, uv + vec2(-pixel_size.x, 1.0 - pixel_size.y)) :
        (uv.x <= pixel_size.x) ? texture(u_height_map_left, uv + vec2(1.0 - pixel_size.x, -pixel_size.y)) :
        texture(u_height_map_center, uv + vec2(-pixel_size.x, -pixel_size.y))
    );

    // 上
    _h_mat[0][1] = convertToHeight(
        (uv.y <= pixel_size.y) ? texture(u_height_map_top, uv + vec2(0.0, 1.0 - pixel_size.y)) :
        texture(u_height_map_center, uv + vec2(0.0, -pixel_size.y))
    );

    // 右上
    _h_mat[0][2] = convertToHeight(
        (uv.x >= 1.0 - pixel_size.x && uv.y <= pixel_size.y) ? texture(u_height_map_right, uv + vec2(-1.0 + pixel_size.x, 1.0 - pixel_size.y)) :
        (uv.y <= pixel_size.y) ? texture(u_height_map_top, uv + vec2(pixel_size.x, 1.0 - pixel_size.y)) :
        (uv.x >= 1.0 - pixel_size.x) ? texture(u_height_map_right, uv + vec2(-1.0 + pixel_size.x, -pixel_size.y)) :
        texture(u_height_map_center, uv + vec2(pixel_size.x, -pixel_size.y))
    );

    // 左
    _h_mat[1][0] = convertToHeight(
        (uv.x <= pixel_size.x) ? texture(u_height_map_left, uv + vec2(1.0 - pixel_size.x, 0.0)) :
        texture(u_height_map_center, uv + vec2(-pixel_size.x, 0.0))
    );

    // 中央
    _h_mat[1][1] = center_h;

    // 右
    _h_mat[1][2] = convertToHeight(
        (uv.x >= 1.0 - pixel_size.x) ? texture(u_height_map_right, uv + vec2(-1.0 + pixel_size.x, 0.0)) :
        texture(u_height_map_center, uv + vec2(pixel_size.x, 0.0))
    );

    // 左下
    _h_mat[2][0] = convertToHeight(
        (uv.x <= pixel_size.x && uv.y >= 1.0 - pixel_size.y) ? texture(u_height_map_left, uv + vec2(1.0 - pixel_size.x, -1.0 + pixel_size.y)) :
        (uv.y >= 1.0 - pixel_size.y) ? texture(u_height_map_bottom, uv + vec2(-pixel_size.x, -1.0 + pixel_size.y)) :
        (uv.x <= pixel_size.x) ? texture(u_height_map_left, uv + vec2(1.0 - pixel_size.x, pixel_size.y)) :
        texture(u_height_map_center, uv + vec2(-pixel_size.x, pixel_size.y))
    );

    // 下
    _h_mat[2][1] = convertToHeight(
        (uv.y >= 1.0 - pixel_size.y) ? texture(u_height_map_bottom, uv + vec2(0.0, -1.0 + pixel_size.y)) :
        texture(u_height_map_center, uv + vec2(0.0, pixel_size.y))
    );

    // 右下
    _h_mat[2][2] = convertToHeight(
        (uv.x >= 1.0 - pixel_size.x && uv.y >= 1.0 - pixel_size.y) ? texture(u_height_map_right, uv + vec2(-1.0 + pixel_size.x, -1.0 + pixel_size.y)) :
        (uv.y >= 1.0 - pixel_size.y) ? texture(u_height_map_bottom, uv + vec2(pixel_size.x, -1.0 + pixel_size.y)) :
        (uv.x >= 1.0 - pixel_size.x) ? texture(u_height_map_right, uv + vec2(-1.0 + pixel_size.x, pixel_size.y)) :
        texture(u_height_map_center, uv + vec2(pixel_size.x, pixel_size.y))
    );

    return _h_mat;
}


// mat3 calculateTerrainData(vec2 uv, float center_h) {
//     // すべてu_height_map_centerのみからサンプリング
//     vec2 pixel_size = vec2(1.0) / 256.0;
//     mat3 _h_mat = mat3(0.0);

//     _h_mat[0][0] = convertToHeight(texture(u_height_map_center, uv + vec2(-pixel_size.x, -pixel_size.y)));
//     _h_mat[0][1] = convertToHeight(texture(u_height_map_center, uv + vec2(0.0, -pixel_size.y)));
//     _h_mat[0][2] = convertToHeight(texture(u_height_map_center, uv + vec2(pixel_size.x, -pixel_size.y)));

//     _h_mat[1][0] = convertToHeight(texture(u_height_map_center, uv + vec2(-pixel_size.x, 0.0)));
//     _h_mat[1][1] = center_h;
//     _h_mat[1][2] = convertToHeight(texture(u_height_map_center, uv + vec2(pixel_size.x, 0.0)));

//     _h_mat[2][0] = convertToHeight(texture(u_height_map_center, uv + vec2(-pixel_size.x, pixel_size.y)));
//     _h_mat[2][1] = convertToHeight(texture(u_height_map_center, uv + vec2(0.0, pixel_size.y)));
//     _h_mat[2][2] = convertToHeight(texture(u_height_map_center, uv + vec2(pixel_size.x, pixel_size.y)));

//     return _h_mat;
// }




void main() {
    vec2 uv = v_tex_coord;
    vec4 color = texture(u_height_map_center, uv);
    if(color.a == 0.0){
        // テクスチャなし、または透明ピクセルの場合
        fragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }

    if (u_mode == 0.0) {
        // デフォルトモード
        fragColor = color;
        return;
    }
    // elevation
    if(u_mode == 1.0) {
        float h = convertToHeight(color);
        if(-9999.0 == h){
            // 無効地の場合
            fragColor = vec4(0.0, 0.0, 0.0, 0.0);
            return;
        }
        float normalized_h = clamp((h - u_min_height) / (u_max_height - u_min_height), 0.0, 1.0);
        vec4 terrain_color = getColorFromMap(u_color_map, normalized_h);

        fragColor = terrain_color;
        return;
    }
    // 陰影起伏図。Web Mercator の地上解像度は南北・東西とも緯度で補正する。
    if (u_mode == 5.0) {
        if (!isShadowHeightValid(color)) {
            fragColor = vec4(0.0);
            return;
        }
        float centerHeight = convertToHeight(color);
        float latitude = getLatitudeFromTileUV(u_tile_y, uv.y, u_tile_z);
        float cellSize = max(getEwRes(u_tile_z, latitude), 0.000001);
        float pixelSize = 1.0 / u_tile_size;
        float dx = shadowGradient(
            sampleShadowHeight(uv - vec2(pixelSize, 0.0)),
            sampleShadowHeight(uv + vec2(pixelSize, 0.0)), centerHeight, cellSize);
        float dz = shadowGradient(
            sampleShadowHeight(uv - vec2(0.0, pixelSize)),
            sampleShadowHeight(uv + vec2(0.0, pixelSize)), centerHeight, cellSize);
        float exaggeration = shadowZoomExaggeration(u_tile_z);
        vec3 normal = normalize(vec3(-dx * exaggeration, 1.0, -dz * exaggeration));
        float intensity = clamp(dot(normal, u_light_direction), 0.0, 1.0);
        // Canvas は premultiplied alpha。透明なベースの RGB を影に混ぜない。
        vec4 shadow = vec4(u_shadow_color.rgb * u_shadow_color.a, u_shadow_color.a);
        vec4 base = vec4(u_base_color.rgb * u_base_color.a, u_base_color.a);
        fragColor = mix(shadow, base, intensity) * color.a;
        return;
    }

    // slope
    if(u_mode == 2.0) {

        float center_h = convertToHeight(color);
        if(center_h == -9999.0) {
            // 無効地の場合
            fragColor = vec4(0.0, 0.0, 0.0, 0.0);
            return;
        }
        mat3 h_mat = calculateTerrainData(v_tex_coord, center_h);

        // タイルのY座標とuv座標からから緯度を取得
        float lat = getLatitudeFromTileUV(u_tile_y, uv.y, u_tile_z);

        // 東西方向の地上解像度（ewres）
        float ewres = getEwRes(u_tile_z, lat);
        // Web Mercator の地上解像度は南北方向も同じ緯度補正が必要。
        float nsres = ewres;

        // 傾斜量を計算
        float slope = computeSlopeHorn(h_mat, ewres, nsres, 1.0, true);
        // 自動配色はタイルのズームから決める。傾斜角自体には倍率を掛けない。
        // z5以下は0–15度、z15以上は0–90度、その間はズームごとに補間する。
        float color_min = u_min_slope;
        float color_max = u_max_slope;
        if (u_slope_auto_range > 0.5) {
            color_min = 0.0;
            color_max = mix(15.0, 90.0, clamp((u_tile_z - 5.0) / 10.0, 0.0, 1.0));
        }
        float normalized_slope = clamp((slope - color_min) / max(color_max - color_min, 0.0001), 0.0, 1.0);

        vec4 slope_color = getColorFromMap(u_color_map, normalized_slope);

        fragColor = slope_color;
        return;

    }

  if(u_mode == 3.0) {
    float center_h = convertToHeight(color);
    if(center_h == -9999.0) {
        // 無効地の場合
        fragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }
    mat3 h_mat = calculateTerrainData(v_tex_coord, center_h);

    // 南北方向の解像度 (nsres)
    float nsres = getResolution(u_tile_z);

    // タイルのY座標とuv座標から緯度を取得
    float latitude_deg = getLatitudeFromTileUV(u_tile_y, uv.y, u_tile_z);

    // 東西方向の解像度 (ewres)
    float ewres = getEwRes(u_tile_z, latitude_deg);

    // 傾斜方位を計算
    float aspect = computeAspectHorn(h_mat, ewres, nsres);
    
    if(aspect == -9999.0) {
        // 無効値の場合
        fragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }

    // 傾斜方位を正規化（0-360度を0-1に）
    float normalized_aspect = aspect / 360.0;

    vec4 aspect_color = getColorFromMap(u_color_map, normalized_aspect);

    fragColor = aspect_color;
    return;
}

    // curvature (dem2CsProtocol方式: ガウス平滑化 + 一般曲率 + 青→黄→赤グラデーション)
    if(u_mode == 4.0) {

        float center_h = convertToHeight(color);
        if(center_h == -9999.0) {
            fragColor = vec4(0.0, 0.0, 0.0, 0.0);
            return;
        }

        // ピクセルあたりの地上解像度を計算
        float nsres = getResolution(u_tile_z);
        float latitude_deg = getLatitudeFromTileUV(u_tile_y, uv.y, u_tile_z);
        float ewres = getEwRes(u_tile_z, latitude_deg);
        float cellSize = (ewres + nsres) / 2.0;

        // dem2CsProtocol方式: ガウスぼかし後の5点で曲率を計算
        // シェーダーでは5x5近傍をサンプリングし、3x3ガウスカーネルで平滑化
        // σ ≈ clamp(3/cellSize, 1.6, 7) をピクセル単位に換算（1ピクセル=cellSize m）
        // σ_pixel = σ_meter / cellSize = clamp(3/cellSize, 1.6, 7) / 1.0
        // 3x3カーネルで表現可能な範囲に制限されるため、近似的なガウス重みを使用

        vec2 pixel_size = vec2(1.0) / u_tile_size;

        // 5x5近傍の高さをサンプリング（行: -2〜+2, 列: -2〜+2 ピクセル）
        // ただし曲率計算に必要な5点（中心、上、下、左、右）の各3x3近傍のみ取得
        // 必要な座標: 中心(0,0)の3x3 + 上(0,-1)の上(0,-2) + 下(0,+1)の下(0,+2)
        //            + 左(-1,0)の左(-2,0) + 右(+1,0)の右(+2,0)

        // サンプリングヘルパー: 隣接タイルを考慮した高さ取得
        // 行[-2..+2], 列[-2..+2] の各オフセットに対して
        // タイル境界をまたぐ場合は隣接タイルからサンプリング
        #define SAMPLE_HEIGHT(dx, dy) convertToHeight( \\
            (uv.x + float(dx) * pixel_size.x < 0.0) ? \\
                texture(u_height_map_left, uv + vec2(float(dx) * pixel_size.x + 1.0, float(dy) * pixel_size.y)) : \\
            (uv.x + float(dx) * pixel_size.x > 1.0) ? \\
                texture(u_height_map_right, uv + vec2(float(dx) * pixel_size.x - 1.0, float(dy) * pixel_size.y)) : \\
            (uv.y + float(dy) * pixel_size.y < 0.0) ? \\
                texture(u_height_map_top, uv + vec2(float(dx) * pixel_size.x, float(dy) * pixel_size.y + 1.0)) : \\
            (uv.y + float(dy) * pixel_size.y > 1.0) ? \\
                texture(u_height_map_bottom, uv + vec2(float(dx) * pixel_size.x, float(dy) * pixel_size.y - 1.0)) : \\
                texture(u_height_map_center, uv + vec2(float(dx) * pixel_size.x, float(dy) * pixel_size.y)) \\
        )

        // 3x3ガウスカーネルの重み（σ ≈ 0.85 に相当、合計 = 1.0 に正規化）
        // dem2CsProtocolのsigmaはメートル単位で最小1.6mだが、
        // ピクセル単位では cellSize によって変わる。
        // 3x3カーネルの場合 σ=0.85 pixel が最適な近似。
        // w_corner=0.0625, w_edge=0.125, w_center=0.25 (ガウス近似)
        const float wC = 0.25;   // 中央
        const float wE = 0.125;  // 辺（上下左右）
        const float wK = 0.0625; // 角

        // 5点の平滑化値を計算（中心、上、下、左、右）
        // 各点の3x3近傍にガウス重みを適用

        // 中心 (0,0) の3x3近傍
        float s_center = center_h * wC
            + SAMPLE_HEIGHT( 0,-1) * wE + SAMPLE_HEIGHT( 0, 1) * wE
            + SAMPLE_HEIGHT(-1, 0) * wE + SAMPLE_HEIGHT( 1, 0) * wE
            + SAMPLE_HEIGHT(-1,-1) * wK + SAMPLE_HEIGHT( 1,-1) * wK
            + SAMPLE_HEIGHT(-1, 1) * wK + SAMPLE_HEIGHT( 1, 1) * wK;

        // 上 (0,-1) の3x3近傍
        float s_top = SAMPLE_HEIGHT( 0,-1) * wC
            + SAMPLE_HEIGHT( 0,-2) * wE + center_h * wE
            + SAMPLE_HEIGHT(-1,-1) * wE + SAMPLE_HEIGHT( 1,-1) * wE
            + SAMPLE_HEIGHT(-1,-2) * wK + SAMPLE_HEIGHT( 1,-2) * wK
            + SAMPLE_HEIGHT(-1, 0) * wK + SAMPLE_HEIGHT( 1, 0) * wK;

        // 下 (0,+1) の3x3近傍
        float s_bottom = SAMPLE_HEIGHT( 0, 1) * wC
            + center_h * wE + SAMPLE_HEIGHT( 0, 2) * wE
            + SAMPLE_HEIGHT(-1, 1) * wE + SAMPLE_HEIGHT( 1, 1) * wE
            + SAMPLE_HEIGHT(-1, 0) * wK + SAMPLE_HEIGHT( 1, 0) * wK
            + SAMPLE_HEIGHT(-1, 2) * wK + SAMPLE_HEIGHT( 1, 2) * wK;

        // 左 (-1,0) の3x3近傍
        float s_left = SAMPLE_HEIGHT(-1, 0) * wC
            + SAMPLE_HEIGHT(-1,-1) * wE + SAMPLE_HEIGHT(-1, 1) * wE
            + SAMPLE_HEIGHT(-2, 0) * wE + center_h * wE
            + SAMPLE_HEIGHT(-2,-1) * wK + SAMPLE_HEIGHT( 0,-1) * wK
            + SAMPLE_HEIGHT(-2, 1) * wK + SAMPLE_HEIGHT( 0, 1) * wK;

        // 右 (+1,0) の3x3近傍
        float s_right = SAMPLE_HEIGHT( 1, 0) * wC
            + SAMPLE_HEIGHT( 1,-1) * wE + SAMPLE_HEIGHT( 1, 1) * wE
            + center_h * wE + SAMPLE_HEIGHT( 2, 0) * wE
            + SAMPLE_HEIGHT( 0,-1) * wK + SAMPLE_HEIGHT( 2,-1) * wK
            + SAMPLE_HEIGHT( 0, 1) * wK + SAMPLE_HEIGHT( 2, 1) * wK;

        // NoData チェック（平滑化後の値が無効なら描画しない）
        if (s_center <= -9000.0 || s_top <= -9000.0 || s_bottom <= -9000.0
            || s_left <= -9000.0 || s_right <= -9000.0) {
            fragColor = vec4(0.0, 0.0, 0.0, 0.0);
            return;
        }

        // dem2CsProtocol方式の一般曲率を計算（平滑化済みの5点から）
        float cellArea = cellSize * cellSize;
        float r = ((s_left + s_right) / 2.0 - s_center) / cellArea;
        float t = ((s_top + s_bottom) / 2.0 - s_center) / cellArea;
        float curvature = -2.0 * (r + t);

        // dem2CsProtocolの曲率係数（ピクセル解像度に応じた色の濃さ調整）
        float curvatureCoefficient;
        if (cellSize < 68.0) {
            curvatureCoefficient = max(cellSize / 2.0, 1.1);
        } else {
            curvatureCoefficient = 0.188 * pow(cellSize, 1.232);
        }

        // 色付け範囲: ±0.2/curvatureCoefficient を 0〜1 に正規化してカラーマップテクスチャで色付け
        float rangeVal = 0.2 / curvatureCoefficient;
        float normalized_curvature = clamp((curvature + rangeVal) / (2.0 * rangeVal), 0.0, 1.0);

        vec4 curvature_color = getColorFromMap(u_color_map, normalized_curvature);

        //  // 青→黄白→赤 のグラデーションの場合
        // vec3 blueColor  = vec3(0.0, 0.0, 1.0);         // 谷（負の曲率）
        // vec3 midColor   = vec3(1.0, 1.0, 0.94);         // 中間（黄白: rgb(255,255,240)）
        // vec3 redColor   = vec3(1.0, 0.0, 0.0);          // 尾根（正の曲率）

        // vec3 outputRgb = colorRamp3(curvature, -rangeVal, rangeVal, blueColor, midColor, redColor);
        fragColor = curvature_color;
        return;

    }
}
`,U=`#version 300 es
in vec4 a_position;
out vec2 v_tex_coord;

void main() {
    gl_Position = a_position;
    v_tex_coord = vec2(a_position.x * 0.5 + 0.5, a_position.y * -0.5 + 0.5); // Y軸を反転
}`;const b=new Map,A=(t,n,e)=>{const r=t.createShader(n);return r?(t.shaderSource(r,e),t.compileShader(r),t.getShaderParameter(r,t.COMPILE_STATUS)?r:(console.error("An error occurred compiling the shaders: "+t.getShaderInfoLog(r)),t.deleteShader(r),null)):(console.error("Unable to create shader"),null)},V=t=>{const n=t.getContext("webgl2");if(!n)throw new Error("WebGL not supported");const e=A(n,n.VERTEX_SHADER,U),r=A(n,n.FRAGMENT_SHADER,F);if(!e||!r)throw new Error("Failed to load shaders");const o=n.createProgram();if(!o)throw new Error("Failed to create program");if(n.attachShader(o,e),n.attachShader(o,r),n.linkProgram(o),!n.getProgramParameter(o,n.LINK_STATUS))throw console.error("Unable to initialize the shader program: "+n.getProgramInfoLog(o)),new Error("Failed to link program");n.useProgram(o);const a=n.createBuffer();if(!a)throw new Error("Failed to create position buffer");n.bindBuffer(n.ARRAY_BUFFER,a);const i=new Float32Array([-1,-1,1,-1,-1,1,1,1]);n.bufferData(n.ARRAY_BUFFER,i,n.STATIC_DRAW);const _=n.getAttribLocation(o,"a_position");return n.enableVertexAttribArray(_),n.vertexAttribPointer(_,2,n.FLOAT,!1,0,0),{canvas:t,gl:n,program:o,positionBuffer:a,texturePool:new Map}},B=t=>{let n=b.get(t);if(!n){const e=new OffscreenCanvas(t,t);n=V(e),b.set(t,n)}return n},y=(t,n)=>{const{gl:e,program:r,texturePool:o}=t;let a=0;Object.entries(n).forEach(([i,{image:_,type:p}])=>{const h=e.TEXTURE0+a;let s=o.get(a)??null;const f=!s;f&&(s=e.createTexture(),o.set(a,s)),e.activeTexture(h),e.bindTexture(e.TEXTURE_2D,s);const v=e.getUniformLocation(r,i);e.uniform1i(v,a),p==="height"?e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,_):e.texImage2D(e.TEXTURE_2D,0,e.RGB,256,1,0,e.RGB,e.UNSIGNED_BYTE,_),f&&(e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST)),a++})},T=(t,n,e)=>{for(const[r,{type:o,value:a}]of Object.entries(e)){const i=t.getUniformLocation(n,r);i!==null&&t[`uniform${o}`](i,a)}};let C=Promise.resolve();self.onmessage=t=>{C=C.then(()=>K(t))};async function K(t){const{tileId:n,center:e,left:r,right:o,top:a,bottom:i,demTypeNumber:_,modeNumber:p,mode:h,max:s,min:f,elevationColorArray:v,shadow:H,slopeAutoRange:P=!1,tile:g,tileSize:m=256,encodeType:w}=t.data;try{const c=B(m),{canvas:L,gl:l,program:x}=c;if(l.viewport(0,0,m,m),l.useProgram(x),h==="relief")T(l,x,{u_dem_type:{type:"1f",value:_},u_mode:{type:"1f",value:p},u_max_height:{type:"1f",value:s},u_min_height:{type:"1f",value:f},u_tile_size:{type:"1f",value:m}}),y(c,{u_height_map_center:{image:e,type:"height"},u_color_map:{image:v,type:"colormap"}});else if(h==="shadow"){const u=G(H);T(l,x,{u_dem_type:{type:"1f",value:_},u_mode:{type:"1f",value:p},u_tile_y:{type:"1f",value:g.y},u_tile_z:{type:"1f",value:g.z},u_tile_size:{type:"1f",value:m},u_light_direction:{type:"3fv",value:I(H)},u_shadow_color:{type:"4fv",value:u.shadow},u_base_color:{type:"4fv",value:u.base}}),y(c,{u_height_map_center:{image:e,type:"height"},u_height_map_left:{image:r,type:"height"},u_height_map_right:{image:o,type:"height"},u_height_map_top:{image:a,type:"height"},u_height_map_bottom:{image:i,type:"height"}})}else if(h==="slope"||h==="curvature"){const u={u_dem_type:{type:"1f",value:_},u_mode:{type:"1f",value:p},u_max_slope:{type:"1f",value:s},u_min_slope:{type:"1f",value:f},u_slope_auto_range:{type:"1f",value:P?1:0},u_tile_y:{type:"1f",value:g.y},u_tile_z:{type:"1f",value:g.z},u_tile_size:{type:"1f",value:m}};T(l,x,u),y(c,{u_height_map_center:{image:e,type:"height"},u_height_map_left:{image:r,type:"height"},u_height_map_right:{image:o,type:"height"},u_height_map_top:{image:a,type:"height"},u_height_map_bottom:{image:i,type:"height"},u_color_map:{image:v,type:"colormap"}})}else if(h==="aspect"){const u={u_dem_type:{type:"1f",value:_},u_mode:{type:"1f",value:p},u_max_aspect:{type:"1f",value:s},u_min_aspect:{type:"1f",value:f},u_tile_y:{type:"1f",value:g.y},u_tile_z:{type:"1f",value:g.z},u_tile_size:{type:"1f",value:m}};T(l,x,u),y(c,{u_height_map_center:{image:e,type:"height"},u_height_map_left:{image:r,type:"height"},u_height_map_right:{image:o,type:"height"},u_height_map_top:{image:a,type:"height"},u_height_map_bottom:{image:i,type:"height"},u_color_map:{image:v,type:"colormap"}})}l.clear(l.COLOR_BUFFER_BIT),l.drawArrays(l.TRIANGLE_STRIP,0,4);const d=await D(L);if(d instanceof ImageBitmap)self.postMessage({id:n,imageBitmap:d},{transfer:[d]});else if(w==="buffar"){const u=await d.arrayBuffer();self.postMessage({id:n,buffer:u})}else w==="blob"&&self.postMessage({id:n,blob:d})}catch(c){c instanceof Error&&self.postMessage({id:n,error:c.message})}}
