#version 300 es
precision highp float;


uniform sampler2D u_tile_tex;

in vec2 v_tex_coord;
out vec4 fragColor;

void main() {
    vec2 uv = v_tex_coord;
    fragColor = texture(u_tile_tex, uv);
}