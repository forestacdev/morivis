#version 300 es
precision highp float;




in vec2 v_tex_coord ;
out vec4 fragColor;
// uniform sampler2D u_texture; // 画像テクスチャ
uniform sampler2D u_textureBitmapR;




void main() {
    vec2 uv = v_tex_coord;
    vec4 color = texture(u_textureBitmapR, uv);

    fragColor = vec4(color.r, 0.0, 0.0, 1.0);

}