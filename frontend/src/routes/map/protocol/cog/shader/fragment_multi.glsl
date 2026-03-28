#version 300 es
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D u_band_r;
uniform sampler2D u_band_g;
uniform sampler2D u_band_b;
uniform float u_r_min;
uniform float u_r_max;
uniform float u_g_min;
uniform float u_g_max;
uniform float u_b_min;
uniform float u_b_max;

in vec2 v_tex_coord;
out vec4 fragColor;

float decodeBand(sampler2D tex) {
    vec4 texel = texture(tex, v_tex_coord);
    if (texel.a == 0.0) return -1.0;
    vec3 rgb = texel.rgb * 255.0;
    return (rgb.r * 256.0 + rgb.g + rgb.b / 256.0) / 65535.0;
}

void main() {
    float r = decodeBand(u_band_r);
    float g = decodeBand(u_band_g);
    float b = decodeBand(u_band_b);

    // いずれかがnodataなら透明
    if (r < 0.0 || g < 0.0 || b < 0.0) {
        fragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }

    float rNorm = clamp((r - u_r_min) / (u_r_max - u_r_min), 0.0, 1.0);
    float gNorm = clamp((g - u_g_min) / (u_g_max - u_g_min), 0.0, 1.0);
    float bNorm = clamp((b - u_b_min) / (u_b_max - u_b_min), 0.0, 1.0);

    fragColor = vec4(rNorm, gNorm, bNorm, 1.0);
}
