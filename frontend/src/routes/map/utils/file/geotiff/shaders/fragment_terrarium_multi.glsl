#version 300 es
precision highp float;
precision highp sampler2DArray;

// Terrarium エンコード済みバンドテクスチャ（配列）
uniform sampler2DArray u_terrarium_bands;

// RGB バンドインデックス
uniform int u_redIndex;
uniform int u_greenIndex;
uniform int u_blueIndex;

// 各バンドのデータ範囲（正規化エンコード時の min/max）
uniform float u_redDataMin;
uniform float u_redDataMax;
uniform float u_greenDataMin;
uniform float u_greenDataMax;
uniform float u_blueDataMin;
uniform float u_blueDataMax;

// 各チャンネルの表示範囲（ユーザー指定の min/max）
uniform float u_redMin;
uniform float u_redMax;
uniform float u_greenMin;
uniform float u_greenMax;
uniform float u_blueMin;
uniform float u_blueMax;

in vec2 v_tex_coord;
out vec4 fragColor;

// Terrarium デコード → 正規化値 (0〜1)
float decodeTerrariumNormalized(vec4 color) {
    vec3 rgb = color.rgb * 255.0;
    return (rgb.r * 256.0 + rgb.g + rgb.b / 256.0) / 65535.0;
}

// デコード → 実値 → 表示正規化
float decodeAndNormalize(int bandIndex, float dataMin, float dataMax, float dispMin, float dispMax) {
    vec4 encoded = texture(u_terrarium_bands, vec3(v_tex_coord, bandIndex));
    if (encoded.a == 0.0) return 0.0;

    float normalized = decodeTerrariumNormalized(encoded);
    float realValue = normalized * (dataMax - dataMin) + dataMin;
    return clamp((realValue - dispMin) / (dispMax - dispMin), 0.0, 1.0);
}

void main() {
    // nodata チェック（代表バンドの alpha）
    vec4 redEncoded = texture(u_terrarium_bands, vec3(v_tex_coord, u_redIndex));
    if (redEncoded.a == 0.0) {
        fragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }

    float r = decodeAndNormalize(u_redIndex, u_redDataMin, u_redDataMax, u_redMin, u_redMax);
    float g = decodeAndNormalize(u_greenIndex, u_greenDataMin, u_greenDataMax, u_greenMin, u_greenMax);
    float b = decodeAndNormalize(u_blueIndex, u_blueDataMin, u_blueDataMax, u_blueMin, u_blueMax);

    fragColor = vec4(r, g, b, 1.0);
}
