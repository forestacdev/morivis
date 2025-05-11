#version 300 es
precision highp float;

uniform sampler2D u_height_map_center;


uniform sampler2D u_elevationMap;
uniform float u_min_height;
uniform float u_max_height;
uniform float u_dem_type; // 0: mapbox, 1: gsi, 2: terrarium


in vec2 v_tex_coord ;
out vec4 fragColor;


// === INSERT_SHADER_MODULES_HERE === //



void main() {
    vec2 uv = v_tex_coord;
    vec4 final_color = vec4(0.0, 0.0,0.0,0.0);


    vec4 color = texture(u_height_map_center, uv);
     if(color.a == 0.0){
        // テクスチャなし、または透明ピクセルの場合
        fragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }
    float h = convertToHeight(color, u_dem_type);
    if(-9999.0 == h){
        // 無効地の場合
        fragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }
    float normalized_h = clamp((h - u_min_height) / (u_max_height - u_min_height), 0.0, 1.0);
    vec4 terrain_color = getColorFromMap(u_elevationMap, normalized_h);

    fragColor = terrain_color;

}


