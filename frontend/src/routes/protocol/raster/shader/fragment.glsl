#version 300 es
precision highp float;

uniform sampler2D u_height_map_center;
uniform sampler2D u_height_map_left;
uniform sampler2D u_height_map_right;
uniform sampler2D u_height_map_top;
uniform sampler2D u_height_map_bottom;

uniform sampler2D u_elevationMap;
uniform float u_min_height;
uniform float u_max_height;
uniform float u_elevation_alpha;

uniform float u_shadow_strength;
uniform float u_ambient;
uniform vec3 u_light_direction;
uniform vec4 u_shadow_color;
uniform vec4 u_highlight_color;

uniform float u_zoom_level;
uniform float u_edge_alpha;
uniform vec4 u_edge_color;
uniform float u_edge_intensity;

in vec2 v_tex_coord ;
out vec4 fragColor;


// gsi (地理院標高タイル)
float convertToHeight(vec4 color) {
    vec3 rgb = color.rgb * 255.0;
    float total = dot(rgb, vec3(65536.0, 256.0, 1.0));
    return mix(total, total - 16777216.0, step(8388608.0, total)) * 0.01;
}

// カラーマップテクスチャから色を取得する関数
vec4 getColorFromMap(sampler2D map, float value) {
    return vec4(texture(map, vec2(value, 0.5)).rgb, 1.0);
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

    vec4 color = texture(u_height_map_center, uv);
    float h = convertToHeight(color);
    float normalized_h = clamp((h - u_min_height) / (u_max_height - u_min_height), 0.0, 1.0);
    vec4 terrain_color = getColorFromMap(u_elevationMap, normalized_h);
    final_color = mix(final_color, terrain_color, u_elevation_alpha);

        // 陰影効果
    vec3 view_direction = normalize(vec3(0.0, 0.0, 1.0)); // 視線ベクトル
    float highlight_strength = 0.5; // ハイライトの強度

    // 拡散光の計算
    float diffuse = max(dot(normal, u_light_direction), 0.0);

    // 環境光と拡散光の合成
    float shadow_factor = u_ambient + (1.0 - u_ambient) * diffuse;
    float shadow_alpha = (1.0 - shadow_factor) * u_shadow_strength;

    // ハイライトの計算
    vec3 reflect_dir = reflect(-u_light_direction, normal); // 反射ベクトル
    float spec = pow(max(dot(view_direction, reflect_dir), 0.0), 16.0); // スペキュラ成分（光沢の鋭さ）
    vec3 final_highlight = highlight_strength * spec * u_highlight_color.rgb; // ハイライトの最終的な強度と色

    // ハイライトと影を重ねる
    final_color.rgb = mix(final_color.rgb, u_shadow_color.rgb, shadow_alpha); // 影の適用
    final_color.rgb += final_highlight; // ハイライトの適用
    final_color.a = final_color.a * (1.0 - shadow_alpha) + shadow_alpha;
    
    // エッジ効果
    float edge_x = abs(terrain_data.h_mat[1][2] - terrain_data.h_mat[1][0]); // 左右の高さ差
    float edge_y = abs(terrain_data.h_mat[2][1] - terrain_data.h_mat[0][1]); // 上下の高さ差
    
    float z = 0.5 * exp2(u_zoom_level - 17.0);
    float edge_intensity = z;
    
    float edge_strength = (edge_x + edge_y) * edge_intensity * u_edge_intensity;
    
    // エッジの透明度を考慮したブレンディング
    vec4 edge = vec4(u_edge_color.rgb, clamp(edge_strength, 0.0, 0.8) * u_edge_alpha);
    
    // アルファブレンディング
    final_color.rgb = mix(final_color.rgb, edge.rgb, edge.a);
    final_color.a = max(final_color.a, edge.a);
    
    fragColor = final_color;
    

}


