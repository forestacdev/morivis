#version 300 es
precision highp float;
precision highp sampler2DArray;

// 元ラスターデータ（バンド配列）
uniform sampler2DArray u_texArray;
// UV再投影マップ（RG = ソース画像上のUV座標）
uniform sampler2D u_uvMap;

uniform int u_redIndex;
uniform int u_greenIndex;
uniform int u_blueIndex;
uniform float u_redMin;
uniform float u_redMax;
uniform float u_greenMin;
uniform float u_greenMax;
uniform float u_blueMin;
uniform float u_blueMax;

in vec2 v_tex_coord;
out vec4 fragColor;

void main() {
    // UVマップからソース画像上の座標を取得
    vec2 srcUV = texture(u_uvMap, v_tex_coord).rg;

    // 範囲外チェック
    if (srcUV.x < 0.0 || srcUV.x > 1.0 || srcUV.y < 0.0 || srcUV.y > 1.0) {
        fragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }

    float r = texture(u_texArray, vec3(srcUV, u_redIndex)).r;
    float g = texture(u_texArray, vec3(srcUV, u_greenIndex)).r;
    float b = texture(u_texArray, vec3(srcUV, u_blueIndex)).r;

    float normalized_r = clamp((r - u_redMin) / (u_redMax - u_redMin), 0.0, 1.0);
    float normalized_g = clamp((g - u_greenMin) / (u_greenMax - u_greenMin), 0.0, 1.0);
    float normalized_b = clamp((b - u_blueMin) / (u_blueMax - u_blueMin), 0.0, 1.0);

    fragColor = vec4(normalized_r, normalized_g, normalized_b, 1.0);
}
