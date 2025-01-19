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

// 三角形内判定関数
float triangleMask(vec2 p, vec2 p0, vec2 p1, vec2 p2) {
    // バリュー（Barycentric Coordinates）を使って三角形内を判定
    vec2 v0 = p1 - p0;
    vec2 v1 = p2 - p0;
    vec2 v2 = p - p0;

    float d00 = dot(v0, v0);
    float d01 = dot(v0, v1);
    float d11 = dot(v1, v1);
    float d20 = dot(v2, v0);
    float d21 = dot(v2, v1);

    float denom = d00 * d11 - d01 * d01;
    float u = (d11 * d20 - d01 * d21) / denom;
    float v = (d00 * d21 - d01 * d20) / denom;

    // u >= 0, v >= 0, u + v <= 1 の場合、三角形内
    return (u >= 0.0 && v >= 0.0 && (u + v) <= 1.0) ? 1.0 : 0.0;
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

      // 三角形の頂点を設定（下向き三角形）
      // 逆さまの三角形を画面の一番下に配置
    vec2 p0 = vec2(0.5, 0.0);   // 画面中央下
    vec2 p1 = vec2(0.3, 0.13);   // 左上
    vec2 p2 = vec2(0.7, 0.13);   // 右上

    // 三角形マスクを適用
    float triangle = triangleMask(st, p0, p1, p2);

    // 円形マスク適用
    vec3 color = textureColor.rgb;

    // 縁取り部分を白にする
    if (mask > 0.0 && outerMask < 1.0) {
        color = vec3(1.0);
    }

    // 三角形部分を白にする
    if (triangle > 0.0) {
        color = vec3(1.0);
    }

    // マスクの外側を透明にする
    float alpha = mask * textureColor.a;
    if (triangle > 0.0) {
        alpha = 1.0; // 三角形部分は完全に不透明
    }

    outColor = vec4(color, alpha);
}