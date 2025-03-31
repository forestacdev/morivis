#version 300 es
precision highp float;

uniform sampler2D u_height_map_center;
uniform sampler2D u_height_map_left;
uniform sampler2D u_height_map_right;
uniform sampler2D u_height_map_top;
uniform sampler2D u_height_map_bottom;

in vec2 v_tex_coord ;
out vec4 fragColor;



void main() {

    fragColor = vec4(1.0, 0.03, 0.0, 1);
}

