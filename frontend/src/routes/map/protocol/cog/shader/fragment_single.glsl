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
    // 範囲外 + nodata → alpha=0 をブランチレスで判定
    float inBounds = step(0.0, v_tex_coord.x) * step(v_tex_coord.x, 1.0)
                   * step(0.0, v_tex_coord.y) * step(v_tex_coord.y, 1.0);

    vec4 texel = texture(u_band_texture, v_tex_coord);
    float valid = inBounds * step(0.001, texel.a);

    vec3 rgb = texel.rgb * 255.0;
    float normalized = (rgb.r * 256.0 + rgb.g + rgb.b / 256.0) / 65535.0;
    float displayNorm = clamp((normalized - u_min) / (u_max - u_min), 0.0, 1.0);
    vec3 color = texture(u_color_map, vec2(displayNorm, 0.5)).rgb;

    fragColor = vec4(color, 1.0) * valid;
}
