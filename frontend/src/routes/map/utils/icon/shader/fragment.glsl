#version 300 es
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform sampler2D u_texture; // 画像テクスチャ

out vec4 outColor; // 出力する色

#define PI 3.14159265358979323846

// 円形マスク関数
float circleMask(vec2 _st, vec2 center, float radius) {
    float dist = length(_st - center);
    float edgeWidth = 0.02; // エッジ幅を増加
    return 1.0 - smoothstep(radius - edgeWidth, radius + edgeWidth, dist);
}

void main(void) {
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    
    // テクスチャ座標 yを反転
    vec2 texCoord = vec2(st.x, 1.0 - st.y);

    // 円形マスクの設定
    float radius = 0.4;
    float mask = circleMask(st, vec2(0.5, 0.5), radius);

    // 白い縁の設定
    float borderThickness = 0.02; // 縁の太さを指定
    float outerMask = circleMask(st, vec2(0.5, 0.5), radius - borderThickness);

    // テクスチャから色をサンプリング
    vec4 textureColor = texture(u_texture, texCoord);

    // 円形マスク適用
    vec3 color = textureColor.rgb;

    // 縁取り部分を白にする
    if (mask > 0.0 && outerMask < 1.0) {
        color = vec3(1.0); // 白い縁
    }

    // マスクの外側を透明にする
    float alpha = mask * textureColor.a;
    outColor = vec4(color, alpha);
}