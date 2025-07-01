#version 300 es
precision highp float;


uniform sampler2D u_height_map_center;
uniform sampler2D u_height_map_left;
uniform sampler2D u_height_map_right;
uniform sampler2D u_height_map_top;
uniform sampler2D u_height_map_bottom;

uniform float u_dem_type; // 0:mapbox, 1:gsi, 2:terrarium
uniform float u_mode; // 0:default, 1:elevation, 2:slope 4:curvature

uniform sampler2D u_color_map;

// elevation
uniform float u_min_height;
uniform float u_max_height;

// slope
uniform float u_tile_z;
uniform float u_tile_y;
uniform float u_max_slope;
uniform float u_min_slope;



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
    return 40075016.68557849 / (256.0 * pow(2.0, float(zoom)));
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

const float CURVATURE_NODATA = -9999.0; // 曲率計算におけるNoDataを示す値

// Zevenbergen & Thorne 法による曲率計算
// 引数:
//   h: 3x3の標高マトリックス (h[column][row])
//   ewres: 東西方向の地上解像度 (メートル/ピクセル)
//   nsres: 南北方向の地上解像度 (メートル/ピクセル)
//   curvatureMode: 計算する曲率のタイプ (1: プロファイル曲率, 2: 平面曲率)
// 戻り値:
//   計算された曲率値 (100倍スケール後)、またはNoDataの場合は CURVATURE_NODATA
float computeCurvatureZT(mat3 h, float ewres, float nsres, int curvatureMode) {
    // NoData値チェック (入力された3x3マトリックス内にNoDataがあれば計算しない)
    for (int col = 0; col < 3; col++) {
        for (int row = 0; row < 3; row++) {
            if (h[col][row] == -9999.0) { // NoData値の条件
                return CURVATURE_NODATA;
            }
        }
    }

    // 3x3ウィンドウの標高値を分かりやすい変数名に割り当て
    // GLSLのmat3は h[column][row] でアクセス
    // z0 z1 z2   (h[0][0] h[1][0] h[2][0])
    // z3 z4 z5   (h[0][1] h[1][1] h[2][1])  (z4 = h[1][1] が中心)
    // z6 z7 z8   (h[0][2] h[1][2] h[2][2])
    float z0 = h[0][0]; float z1 = h[1][0]; float z2 = h[2][0]; // Top row
    float z3 = h[0][1]; float z4 = h[1][1]; float z5 = h[2][1]; // Middle row (z4 is center)
    float z6 = h[0][2]; float z7 = h[1][2]; float z8 = h[2][2]; // Bottom row

    // 偏導関数の計算
    // Dx = (MidRight - MidLeft) / (2 * ewres)
    float Dx  = (z5 - z3) / (2.0 * ewres);
    // Dy = (TopCenter - BottomCenter) / (2 * nsres)
    // (DEMのY軸が上向き正と仮定。z1がz7より「上」にある)
    float Dy  = (z1 - z7) / (2.0 * nsres);

    // Dxx = (MidLeft + MidRight - 2 * Center) / (ewres^2)
    float Dxx = (z3 + z5 - 2.0 * z4) / (ewres * ewres);
    // Dyy = (TopCenter + BottomCenter - 2 * Center) / (nsres^2)
    float Dyy = (z1 + z7 - 2.0 * z4) / (nsres * nsres);

    // Dxy = (TopLeft - TopRight - BottomLeft + BottomRight) / (4 * ewres * nsres)
    float Dxy = (z0 - z2 - z6 + z8) / (4.0 * ewres * nsres);

    float curvatureVal = 0.0;
    float P_denominator = Dx*Dx + Dy*Dy; // 共通の分母の一部

    if (P_denominator > 1.0e-9) { // ほぼ平坦な場所でのゼロ除算を避ける
        if (curvatureMode == 1) { // Profile Curvature (プロファイル曲率)
            curvatureVal = (Dxx * Dx*Dx + 2.0 * Dxy * Dx*Dy + Dyy * Dy*Dy) / P_denominator;
        } else if (curvatureMode == 2) { // Planform Curvature (平面曲率)
            curvatureVal = (Dxx * Dy*Dy - 2.0 * Dxy * Dx*Dy + Dyy * Dx*Dx) / P_denominator;
        } else {
            // 未定義の curvatureMode の場合は NoData を返す
            return CURVATURE_NODATA;
        }
    } else {
        curvatureVal = 0.0; // 平坦な領域では曲率0
    }

    // GDALの出力に合わせて100倍する
    return curvatureVal * 100.0;
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

    vec2 pixel_size = vec2(1.0) / 256.0;
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

    // curvature
    if(u_mode == 4.0) {

        float center_h = convertToHeight(color);
        if(center_h == -9999.0) {
            // 無効地の場合
            fragColor = vec4(0.0, 0.0, 0.0, 0.0);
            return;
        }
        mat3 h_mat = calculateTerrainData(v_tex_coord, center_h);

        // 南北方向の解像度 (nsres)
        // ユーザー提供コードでは定数でしたが、一般的にはズームレベルから計算できます。
        // float nsres = 9.5546; // ユーザー指定の定数
        float nsres = getResolution(u_tile_z); // こちらが一般的（メルカトル図法タイルの場合）

        // タイルのY座標とuv座標から緯度を取得 (あなたの関数)
        float latitude_deg = getLatitudeFromTileUV(u_tile_y, uv.y, u_tile_z);

        // 東西方向の解像度 (ewres) (あなたの関数)
        float ewres = getEwRes(u_tile_z, latitude_deg);

        // プロファイル曲率を計算 (mode = 1)
        float profileCurvature = computeCurvatureZT(h_mat, ewres, nsres, 1);

        // 平面曲率を計算 (mode = 2)
        float planformCurvature = computeCurvatureZT(h_mat, ewres, nsres, 2);

        // 結果の出力 (例: プロファイル曲率を赤、平面曲率を緑で表示)
      // 結果の出力 (尾根と谷に色を付ける)
        vec4 outputColor = vec4(0.5, 0.5, 0.5, 1.0); // デフォルトは中間色 (グレー)

        // NoDataでない場合のみ色付け処理
        if (planformCurvature != CURVATURE_NODATA) {
            float ridgeThreshold = 0.1;  // 尾根と判断する平面曲率の閾値 (正の値)
            float valleyThreshold = -0.1; // 谷と判断する平面曲率の閾値 (負の値)

            vec3 ridgeColor = vec3(1.0, 0.0, 0.0);   // 尾根の色 (例: 赤)
            vec3 valleyColor = vec3(0.0, 0.0, 1.0);  // 谷の色 (例: 青)
            vec3 neutralColor = vec3(0.8, 0.8, 0.7); // 中間的な斜面の色 (例: 明るいベージュ)
            // vec3 neutralColor = texture(u_terrain_texture, v_tex_coord).rgb; // 元の地形の色を使う場合

            if (planformCurvature > ridgeThreshold) {
                // 尾根: 曲率が大きいほど色を濃くする (オプション)
                float intensity = clamp((planformCurvature - ridgeThreshold) / (2.0 - ridgeThreshold), 0.0, 1.0); // 例: 0.5～2.0の範囲を0～1に
                outputColor.rgb = mix(neutralColor, ridgeColor, intensity * 0.8 + 0.2); // 0.2は最低限の色味
            } else if (planformCurvature < valleyThreshold) {
                // 谷: 曲率が小さい(より負の方向に大きい)ほど色を濃くする (オプション)
                float intensity = clamp((abs(planformCurvature) - abs(valleyThreshold)) / (2.0 - abs(valleyThreshold)), 0.0, 1.0); // 例: 0.5～2.0の範囲を0～1に
                outputColor.rgb = mix(neutralColor, valleyColor, intensity * 0.8 + 0.2);
            } else {
                // 中間的な斜面
                outputColor.rgb = neutralColor;
            }
            outputColor.a = 1.0; // 不透明
        } else {
            // NoDataの場合は完全に透明にするなど
            outputColor = vec4(0.0, 0.0, 0.0, 0.0);
        }

        fragColor = outputColor;
        return;

    }
}


