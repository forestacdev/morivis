#version 300 es
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif


uniform sampler2D u_height_map;
uniform float u_dem_type; // 0:mapbox, 1:gsi, 2:terrarium

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

vec2 pixel_size = vec2(1.0) / 256.0;

mat3 calculateTerrainData(vec2 uv, float center_h) {
    // すべてu_height_map_centerのみからサンプリング
 
    mat3 _h_mat = mat3(0.0);

    _h_mat[0][0] = convertToHeight(texture(u_height_map, uv + vec2(-pixel_size.x, -pixel_size.y)));
    _h_mat[0][1] = convertToHeight(texture(u_height_map, uv + vec2(0.0, -pixel_size.y)));
    _h_mat[0][2] = convertToHeight(texture(u_height_map, uv + vec2(pixel_size.x, -pixel_size.y)));

    _h_mat[1][0] = convertToHeight(texture(u_height_map, uv + vec2(-pixel_size.x, 0.0)));
    _h_mat[1][1] = center_h;
    _h_mat[1][2] = convertToHeight(texture(u_height_map, uv + vec2(pixel_size.x, 0.0)));

    _h_mat[2][0] = convertToHeight(texture(u_height_map, uv + vec2(-pixel_size.x, pixel_size.y)));
    _h_mat[2][1] = convertToHeight(texture(u_height_map, uv + vec2(0.0, pixel_size.y)));
    _h_mat[2][2] = convertToHeight(texture(u_height_map, uv + vec2(pixel_size.x, pixel_size.y)));

    return _h_mat;
}




void main() {
    vec2 uv = v_tex_coord;
    vec4 color = texture(u_height_map, uv);
    if(color.a == 0.0){
        // テクスチャなし、または透明ピクセルの場合
        fragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }

    float center_h = convertToHeight(color);
    if(center_h == -9999.0) {
        // 無効地の場合
        fragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }
    mat3 h_mat = calculateTerrainData(v_tex_coord, center_h);

        // 法線の計算
    float normal_x = (h_mat[0][0] + h_mat[0][1] + h_mat[0][2]) - 
                    (h_mat[2][0] + h_mat[2][1] + h_mat[2][2]);
    float normal_y = (h_mat[0][0] + h_mat[1][0] + h_mat[2][0]) - 
                    (h_mat[0][2] + h_mat[1][2] + h_mat[2][2]);
    float normal_z = 2.0 * pixel_size.x * 256.0; // スケーリング係数
    vec3 normal = vec3(normal_x, normal_y, normal_z);
    normal = normalize(normal);
    
     vec3 n = normalize(cross(
        vec3(1.0, 0.0, h_mat[0][2] - h_mat[0][0]),
        vec3(0.0, 1.0, h_mat[2][1] - h_mat[0][1])
    )) * 0.5 + 0.5;
    
    
    vec4 col = vec4(vec3(n), 1.0);

    fragColor = col;
    return;
}


