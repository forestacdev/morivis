#version 300 es
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D u_height_map;
uniform float u_dem_type; // mapbox(0.0), gsi(1.0), terrarium(2.0)
in vec2 v_tex_coord;
out vec4 fragColor;

void main() {
    vec4 color = texture(u_height_map, v_tex_coord);

    // u_dem_type が 0.0 の場合は color を返し、他の値の場合は処理を続ける
    float demTypeStep = step(0.5, u_dem_type);  // 0.0 の場合は 0.0、他の値の場合は 1.0
    vec4 defaultColor = color;

    vec3 rgb = color.rgb * 255.0;

    // terrainRGBにおける高度0の色
    vec4 zero_elevation_color = vec4(1.0, 134.0, 160.0, 255.0) / 255.0;

    // defaultColorが完全に透明なら zero_elevation_color に設定
    if (defaultColor.a == 0.0) {
        defaultColor = zero_elevation_color;
    }

    float height;

    // 高さの計算 (u_dem_typeによって異なる処理)
    if (u_dem_type == 1.0) {  // gsi(地理院標高タイル)
        float rgb_value = dot(rgb, vec3(65536.0, 256.0, 1.0));
        height = mix(rgb_value, rgb_value - 16777216.0, step(8388608.0, rgb_value)) * 0.01;
        height = (height + 10000.0) * 10.0;
    } else if (u_dem_type == 2.0) {  // Terrarium-RGB
        height = (rgb.r * 256.0 + rgb.g + rgb.b / 256.0) - 32768.0;
        height = (height + 10000.0) * 10.0;  // Mapbox RGB に合わせたスケーリング
    }

    // 地理院標高タイルまたはTerrarium-RGBの無効値または完全に透明なピクセルの判定
    float is_valid = float(
        (u_dem_type == 1.0 && (rgb.r != 128.0 || rgb.g != 0.0 || rgb.b != 0.0) && color.a != 0.0) ||
        (u_dem_type == 2.0 && color.a != 0.0)
    );

    // 標高カラーの計算
    vec4 elevationColor = vec4(
        floor(height / 65536.0) / 255.0,
        floor(mod(height / 256.0, 256.0)) / 255.0,
        mod(height, 256.0) / 255.0,
        1.0
    );

    // 無効値の場合は zero_elevation_color を使用
    vec4 finalColor = mix(zero_elevation_color, elevationColor, is_valid);

    // demTypeStep に応じてデフォルトの色か標高色を選択
    fragColor = mix(defaultColor, finalColor, demTypeStep);
}