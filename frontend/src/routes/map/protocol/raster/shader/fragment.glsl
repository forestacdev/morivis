#version 300 es
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
uniform float u_mode; // 0.0:default, 1.0:elevation, 2.0:slope, 3:aspect 4.0:curvature

uniform sampler2D u_color_map;

// elevation
uniform float u_min_height;
uniform float u_max_height;

// slope
uniform float u_tile_z;
uniform float u_tile_y;
uniform float u_max_slope;
uniform float u_min_slope;

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

        return (rgb.r * 256.0 + rgb.g + rgb.b / 256.0) - 32768.0;
    }
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
// 青→黄→赤
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
    // slope
    if(u_mode == 2.0) {

        float center_h = convertToHeight(color);
        if(center_h == -9999.0) {
            // 無効地の場合
            fragColor = vec4(0.0, 0.0, 0.0, 0.0);
            return;
        }
        mat3 h_mat = calculateTerrainData(v_tex_coord, center_h);

        // 南北方向の地上解像度（nsres）
        float nsres = getResolution(u_tile_z);

        // タイルのY座標とuv座標からから緯度を取得
        float lat = getLatitudeFromTileUV(u_tile_y, uv.y, u_tile_z);

        // 東西方向の地上解像度（ewres）
        float ewres = getEwRes(u_tile_z, lat);

        // 傾斜量を計算
        float slope = computeSlopeHorn(h_mat, ewres, nsres, 1.0, true);
        // 傾斜量を正規化
        float normalized_slope = clamp((slope - u_min_slope) / (u_max_slope - u_min_slope), 0.0, 1.0);

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
        #define SAMPLE_HEIGHT(dx, dy) convertToHeight( \
            (uv.x + float(dx) * pixel_size.x < 0.0) ? \
                texture(u_height_map_left, uv + vec2(float(dx) * pixel_size.x + 1.0, float(dy) * pixel_size.y)) : \
            (uv.x + float(dx) * pixel_size.x > 1.0) ? \
                texture(u_height_map_right, uv + vec2(float(dx) * pixel_size.x - 1.0, float(dy) * pixel_size.y)) : \
            (uv.y + float(dy) * pixel_size.y < 0.0) ? \
                texture(u_height_map_top, uv + vec2(float(dx) * pixel_size.x, float(dy) * pixel_size.y + 1.0)) : \
            (uv.y + float(dy) * pixel_size.y > 1.0) ? \
                texture(u_height_map_bottom, uv + vec2(float(dx) * pixel_size.x, float(dy) * pixel_size.y - 1.0)) : \
                texture(u_height_map_center, uv + vec2(float(dx) * pixel_size.x, float(dy) * pixel_size.y)) \
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

        // 色付け範囲: dem2CsProtocolと同じ ±0.2/curvatureCoefficient
        float rangeVal = 0.2 / curvatureCoefficient;

        // 青→黄白→赤 のグラデーション
        vec3 blueColor  = vec3(0.0, 0.0, 1.0);         // 谷（負の曲率）
        vec3 midColor   = vec3(1.0, 1.0, 0.94);         // 中間（黄白: rgb(255,255,240)）
        vec3 redColor   = vec3(1.0, 0.0, 0.0);          // 尾根（正の曲率）

        vec3 outputRgb = colorRamp3(curvature, -rangeVal, rangeVal, blueColor, midColor, redColor);
        fragColor = vec4(outputRgb, 1.0);
        return;

    }
}


