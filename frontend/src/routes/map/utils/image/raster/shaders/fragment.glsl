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

// 法線計算関数
vec3 calculateNormal(mat3 h_mat) {
    float normal_x = (h_mat[0][0] + h_mat[0][1] + h_mat[0][2]) - 
                    (h_mat[2][0] + h_mat[2][1] + h_mat[2][2]);
    float normal_y = (h_mat[0][0] + h_mat[1][0] + h_mat[2][0]) - 
                    (h_mat[0][2] + h_mat[1][2] + h_mat[2][2]);
    float normal_z = 2.0 * pixel_size.x * 256.0; // スケーリング係数
    
    return normalize(vec3(normal_x, normal_y, normal_z));
}

// 陰影計算関数
float calculateHillshade(vec3 normal, vec3 light_dir) {
    // Lambert陰影計算
    float hillshade = dot(normal, light_dir);
    // 0.0-1.0の範囲にクランプ
    return clamp(hillshade, 0.0, 1.0);
}

// 度数からラジアンへの変換
float degToRad(float deg) {
    return deg * 3.14159265359 / 180.0;
}

// 光源方向の計算（方位角と仰角から）
vec3 calculateLightDirection(float azimuth, float elevation) {
    float az_rad = degToRad(azimuth);
    float el_rad = degToRad(elevation);
    
    // 光源方向ベクトル（光源から地面への方向）
    return normalize(vec3(
        sin(az_rad) * cos(el_rad),
        cos(az_rad) * cos(el_rad),
        sin(el_rad)
    ));
}

float u_light_intensity = 0.8; // 光源の強度
float u_ambient = 0.2; // 環境光の強度


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


   // 地形データと法線を計算
    mat3 h_mat = calculateTerrainData(v_tex_coord, center_h);
    vec3 normal = calculateNormal(h_mat);
    
    // 3つの光源を定義（論文に基づく）
    // 光源1: 0度（上）- マゼンタ（濃度：高）
    vec3 light1_dir = calculateLightDirection(0.0, 45.0);
    // 光源2: 270度（左）- シアン（濃度：中）
    vec3 light2_dir = calculateLightDirection(270.0, 45.0);
    // 光源3: 90度（右）- イエロー（濃度：低）
    vec3 light3_dir = calculateLightDirection(90.0, 45.0);
    
    // 各光源からの陰影値を計算
    float hillshade1 = calculateHillshade(normal, light1_dir);
    float hillshade2 = calculateHillshade(normal, light2_dir);
    float hillshade3 = calculateHillshade(normal, light3_dir);
    
    // 環境光を加算
    hillshade1 = mix(u_ambient, 1.0, hillshade1);
    hillshade2 = mix(u_ambient, 1.0, hillshade2);
    hillshade3 = mix(u_ambient, 1.0, hillshade3);
    
    // 光源強度を適用
    hillshade1 *= u_light_intensity;
    hillshade2 *= u_light_intensity;
    hillshade3 *= u_light_intensity;
    
   // 多重光源陰影の合成（グレースケール）
    // 各光源の重み付け（論文の設定: 上 > 左 > 右）
    float weight1 = 0.5;    // 上（0度）- 濃度：高
    float weight2 = 0.3;    // 左（270度）- 濃度：中
    float weight3 = 0.2;    // 右（90度）- 濃度：低
    
    // 重み付き平均で陰影を合成
    float combined_hillshade = (hillshade1 * weight1 + hillshade2 * weight2 + hillshade3 * weight3) / (weight1 + weight2 + weight3);
    
    // または、最大値を取る方法（より強い陰影効果）
    // float combined_hillshade = max(max(hillshade1 * weight1, hillshade2 * weight2), hillshade3 * weight3);
    
    // または、乗算合成（より柔らかい陰影効果）
    // float combined_hillshade = hillshade1 * hillshade2 * hillshade3;
    
    // 最終的な影色（グレースケール）
    vec3 shadow_color = vec3(combined_hillshade);
    
    fragColor = vec4(shadow_color, 1.0);
}


