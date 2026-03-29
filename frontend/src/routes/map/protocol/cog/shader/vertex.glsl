#version 300 es
in vec2 a_position;
in vec2 a_texcoord;
out vec2 v_tex_coord;

void main() {
    // a_position: 0-1 正規化座標 → クリップ座標 -1〜1
    gl_Position = vec4(a_position * 2.0 - 1.0, 0.0, 1.0);
    // Y軸反転（タイル座標は上が0、GL座標は下が-1）
    gl_Position.y = -gl_Position.y;
    v_tex_coord = a_texcoord;
}
