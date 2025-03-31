#version 300 es
precision highp float;

uniform sampler2D u_height_map_center;
uniform sampler2D u_height_map_left;
uniform sampler2D u_height_map_right;
uniform sampler2D u_height_map_top;
uniform sampler2D u_height_map_bottom;

in vec2 v_tex_coord ;
out vec4 fragColor;




// gsi (地理院標高タイル)
float convertToHeight(vec4 color) {
    vec3 rgb = color.rgb * 255.0;
    float total = dot(rgb, vec3(65536.0, 256.0, 1.0));
    return mix(total, total - 16777216.0, step(8388608.0, total)) * 0.01;
}


struct TerrainData {
    vec3 normal;
    mat3 h_mat;
};

TerrainData calculateTerrainData(vec2 uv) {

    TerrainData data;
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
    // |        | top    | 　　　  |
    // ----------------------------
    // | left   | center | right  |
    // ----------------------------
    // |        | bottom |        |
    // ----------------------------

    vec2 pixel_size = vec2(1.0) / 256.0;


    // 端の場合は隣接テクスチャからサンプル
    // 左上
    data.h_mat[0][0] = convertToHeight(
        (uv.x <= pixel_size.x && uv.y <= pixel_size.y) ? texture(u_height_map_left, uv + vec2(1.0 - pixel_size.x, 1.0 - pixel_size.y)) :
        (uv.y <= pixel_size.y) ? texture(u_height_map_top, uv + vec2(-pixel_size.x, 1.0 - pixel_size.y)) :
        (uv.x <= pixel_size.x) ? texture(u_height_map_left, uv + vec2(1.0 - pixel_size.x, -pixel_size.y)) :
        texture(u_height_map_center, uv + vec2(-pixel_size.x, -pixel_size.y))
    );

    // 上
    data.h_mat[0][1] = convertToHeight(
        (uv.y <= pixel_size.y) ? texture(u_height_map_top, uv + vec2(0.0, 1.0 - pixel_size.y)) :
        texture(u_height_map_center, uv + vec2(0.0, -pixel_size.y))
    );

    // 右上
    data.h_mat[0][2] = convertToHeight(
        (uv.x >= 1.0 - pixel_size.x && uv.y <= pixel_size.y) ? texture(u_height_map_right, uv + vec2(-1.0 + pixel_size.x, 1.0 - pixel_size.y)) :
        (uv.y <= pixel_size.y) ? texture(u_height_map_top, uv + vec2(pixel_size.x, 1.0 - pixel_size.y)) :
        (uv.x >= 1.0 - pixel_size.x) ? texture(u_height_map_right, uv + vec2(-1.0 + pixel_size.x, -pixel_size.y)) :
        texture(u_height_map_center, uv + vec2(pixel_size.x, -pixel_size.y))
    );

    // 左
    data.h_mat[1][0] = convertToHeight(
        (uv.x <= pixel_size.x) ? texture(u_height_map_left, uv + vec2(1.0 - pixel_size.x, 0.0)) :
        texture(u_height_map_center, uv + vec2(-pixel_size.x, 0.0))
    );

    // 中央
    data.h_mat[1][1] = convertToHeight(texture(u_height_map_center, uv));

    // 右
    data.h_mat[1][2] = convertToHeight(
        (uv.x >= 1.0 - pixel_size.x) ? texture(u_height_map_right, uv + vec2(-1.0 + pixel_size.x, 0.0)) :
        texture(u_height_map_center, uv + vec2(pixel_size.x, 0.0))
    );

    // 左下
    data.h_mat[2][0] = convertToHeight(
        (uv.x <= pixel_size.x && uv.y >= 1.0 - pixel_size.y) ? texture(u_height_map_left, uv + vec2(1.0 - pixel_size.x, -1.0 + pixel_size.y)) :
        (uv.y >= 1.0 - pixel_size.y) ? texture(u_height_map_bottom, uv + vec2(-pixel_size.x, -1.0 + pixel_size.y)) :
        (uv.x <= pixel_size.x) ? texture(u_height_map_left, uv + vec2(1.0 - pixel_size.x, pixel_size.y)) :
        texture(u_height_map_center, uv + vec2(-pixel_size.x, pixel_size.y))
    );

    // 下
    data.h_mat[2][1] = convertToHeight(
        (uv.y >= 1.0 - pixel_size.y) ? texture(u_height_map_bottom, uv + vec2(0.0, -1.0 + pixel_size.y)) :
        texture(u_height_map_center, uv + vec2(0.0, pixel_size.y))
    );

    // 右下
    data.h_mat[2][2] = convertToHeight(
        (uv.x >= 1.0 - pixel_size.x && uv.y >= 1.0 - pixel_size.y) ? texture(u_height_map_right, uv + vec2(-1.0 + pixel_size.x, -1.0 + pixel_size.y)) :
        (uv.y >= 1.0 - pixel_size.y) ? texture(u_height_map_bottom, uv + vec2(pixel_size.x, -1.0 + pixel_size.y)) :
        (uv.x >= 1.0 - pixel_size.x) ? texture(u_height_map_right, uv + vec2(-1.0 + pixel_size.x, pixel_size.y)) :
        texture(u_height_map_center, uv + vec2(pixel_size.x, pixel_size.y))
    );

    // 法線の計算
    data.normal.x = (data.h_mat[0][0] + data.h_mat[0][1] + data.h_mat[0][2]) - 
                    (data.h_mat[2][0] + data.h_mat[2][1] + data.h_mat[2][2]);
    data.normal.y = (data.h_mat[0][0] + data.h_mat[1][0] + data.h_mat[2][0]) - 
                    (data.h_mat[0][2] + data.h_mat[1][2] + data.h_mat[2][2]);
    data.normal.z = 2.0 * pixel_size.x * 256.0; // スケーリング係数
    data.normal = normalize(data.normal);

    return data;
}



void main() {
    vec2 uv = v_tex_coord;
    vec4 final_color = vec4(0.0, 0.0,0.0,0.0);

    TerrainData terrain_data;
    terrain_data = calculateTerrainData(uv);

    vec3 normal = terrain_data.normal;

    vec3 normalizedColor = (normal + 1.0) * 0.5;
    final_color = vec4(normalizedColor, 1.0);
    
    fragColor = final_color;
}


