#version 300 es
precision highp float;

uniform sampler2D u_height_map_center;


uniform sampler2D u_elevationMap;
uniform float u_min_height;
uniform float u_max_height;


in vec2 v_tex_coord ;
out vec4 fragColor;


// === INSERT_SHADER_MODULES_HERE === //



void main() {
    vec2 uv = v_tex_coord;
    vec4 final_color = vec4(0.0, 0.0,0.0,0.0);


    vec4 color = texture(u_height_map_center, uv);
    float h = convertToHeight(color);
    float normalized_h = clamp((h - u_min_height) / (u_max_height - u_min_height), 0.0, 1.0);
    vec4 terrain_color = getColorFromMap(u_elevationMap, normalized_h);

    fragColor = terrain_color;

}


