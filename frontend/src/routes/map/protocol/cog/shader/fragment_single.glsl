#version 300 es
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D u_band_texture;
uniform sampler2D u_color_map;
uniform float u_min;
uniform float u_max;

in vec2 v_tex_coord;
out vec4 fragColor;

void main() {
    vec4 texel = texture(u_band_texture, v_tex_coord);

    // alpha=0 は nodata
    if (texel.a == 0.0) {
        fragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }

    // Terrarium-like decode: R*256 + G + B/256 → 0~65535 → normalized 0~1
    vec3 rgb = texel.rgb * 255.0;
    float normalized = (rgb.r * 256.0 + rgb.g + rgb.b / 256.0) / 65535.0;

    // min/max 範囲にリマップ
    float displayNorm = clamp((normalized - u_min) / (u_max - u_min), 0.0, 1.0);

    // カラーマップルックアップ
    vec3 color = texture(u_color_map, vec2(displayNorm, 0.5)).rgb;
    fragColor = vec4(color, 1.0);
}
