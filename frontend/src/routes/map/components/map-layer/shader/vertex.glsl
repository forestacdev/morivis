#version 300 es
precision highp float;

uniform mat4 u_matrix;
in vec2 a_position;
out vec2 v_tex_coord;

void main() {
    gl_Position = u_matrix * vec4(a_position, 0.0, 1.0);
    v_tex_coord = a_position / 4096.0;
}