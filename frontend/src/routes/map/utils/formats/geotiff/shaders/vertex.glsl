#version 300 es
in vec4 a_position;
out vec2 v_tex_coord;

void main() {
    gl_Position = a_position;
    v_tex_coord = vec2(a_position.x * 0.5 + 0.5, a_position.y * -0.5 + 0.5);
}