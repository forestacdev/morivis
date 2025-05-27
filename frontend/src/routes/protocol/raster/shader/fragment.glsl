#version 300 es
precision highp float;


uniform sampler2D u_height_map_center;
uniform sampler2D u_height_map_left;
uniform sampler2D u_height_map_right;
uniform sampler2D u_height_map_top;
uniform sampler2D u_height_map_bottom;

uniform float u_dem_type; // 0:mapbox, 1:gsi, 2:terrarium
uniform float u_mode; // 0:default, 1:elevation, 2:slope

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

    // 無効値チェック（9999.0 が1つでも含まれていたらスキップ）
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


mat3 calculateTerrainData(vec2 uv) {


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
    _h_mat[1][1] = convertToHeight(texture(u_height_map_center, uv));

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




void main() {
    vec2 uv = v_tex_coord;

    vec4 color = texture(u_height_map_center, uv);
    if(color.a == 0.0){
        // テクスチャなし、または透明ピクセルの場合
        fragColor = vec4(0.0, 0.0, 0.0, 0.0);
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

    // slope
    }else if(u_mode == 2.0) {

        mat3 h_mat = calculateTerrainData(v_tex_coord);

        // 南北方向の地上解像度（nsres）
        float nsres = getResolution(u_tile_z);

        // タイルのY座標とuv座標からから緯度を取得
        float lat = getLatitudeFromTileUV(u_tile_y, uv.y, u_tile_z);

        // 東西方向の地上解像度（ewres）
        float ewres = getEwRes(u_tile_z, lat);

        // 傾斜量を計算
        float slope = computeSlopeHorn(h_mat, ewres, nsres, 1.0, true);
        // if (slope == -9999.0) {
        //     // 無効値が含まれている場合はスキップ
        //     fragColor = vec4(0.0, 0.0, 0.0, 0.0);
        //     return;
        // }
        // 傾斜量を正規化
        float normalized_slope = clamp((slope - u_min_slope) / (u_max_slope - u_min_slope), 0.0, 1.0);

        vec4 slope_color = getColorFromMap(u_color_map, normalized_slope);

        fragColor = slope_color;
        return;

    }
}


