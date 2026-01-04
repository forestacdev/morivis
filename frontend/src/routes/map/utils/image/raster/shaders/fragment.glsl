#version 300 es
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D u_image;
uniform vec3 u_target_color;      // 置き換え対象の色 (RGB: 0.0-1.0)
uniform vec3 u_replacement_color; // 置き換え後の色 (RGB: 0.0-1.0)
uniform float u_tolerance;        // 色の許容誤差 (0.0-1.0)

in vec2 v_tex_coord;
out vec4 fragColor;

void main() {
    vec4 tex = texture(u_image, v_tex_coord);

    if (tex.a == 0.0) {
        fragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }

    // 対象カラーとの距離を計算
    float dist = distance(tex.rgb, u_target_color);

    if (dist <= u_tolerance) {
        // 対象カラーに近い場合は置き換え
        fragColor = vec4(u_replacement_color, tex.a);
    } else {
        // それ以外はそのまま
        fragColor = tex;
    }
}


