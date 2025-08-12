#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

varying vec2 v_uv;
uniform vec2 resolution;
uniform float time;
uniform float animationFlag; // 0=何もしない, 1=出現アニメ, -1=消失アニメ

// 六角形の距離関数
float hexDist(vec2 p) {
    p = abs(p);
    float c = dot(p, normalize(vec2(1.0, 1.732)));
    c = max(c, p.x);
    return c;
}

// 六角グリッドの座標変換
vec4 hexCoords(vec2 uv) {
    vec2 r = vec2(1.0, 1.732);
    vec2 h = r * 0.5;

    vec2 a = mod(uv, r) - h;
    vec2 b = mod(uv - h, r) - h;

    vec2 gv = dot(a, a) < dot(b, b) ? a : b;
    vec2 id = uv - gv;

    return vec4(gv, id);
}

void main(void) {
    // 正規化された画面座標 (-1 to 1)
    vec2 screenUV = (gl_FragCoord.xy - 0.5 * resolution.xy) / min(resolution.x, resolution.y);
    
    // 六角グリッド用の座標
    vec2 uv = (gl_FragCoord.xy - 0.5 * resolution.xy) / resolution.y;
    float baseScale = 10.0;
    uv *= baseScale;

    vec4 hc = hexCoords(uv);
    vec2 gv = hc.xy;
    vec2 id = hc.zw;

    // 画面座標での基準点設定（右下角から開始）
    vec2 startPoint = vec2(1.0, -1.0); // 右下角
    vec2 direction = normalize(vec2(-1.0, 1.0)); // 左上への方向ベクトル（45度）
    
    // 各六角形の画面座標での位置を計算
    vec2 hexScreenPos = (id / baseScale) * resolution.y / min(resolution.x, resolution.y);
    
    // 基準点からの距離（方向ベクトルに沿った距離）
    vec2 toHex = hexScreenPos - startPoint;
    float distAlongDirection = dot(toHex, direction);
    
    // アニメーション設定
    float animationSpeed = 4.0;
    float delayPerUnitDist = 1.0; // 単位距離あたりの遅延
    float scale = 0.0;

    if (animationFlag > 0.5) {
        // 出現アニメーション (0から1へ)
        float appearTiming = distAlongDirection * delayPerUnitDist - time * animationSpeed;
        scale = smoothstep(0.0, -1.0, appearTiming);
    } else if (animationFlag < -0.5) {
        // 消失アニメーション (1から0へ)
        float disappearTiming = distAlongDirection * delayPerUnitDist - time * animationSpeed;
        scale = 1.0 - smoothstep(0.0, -1.0, disappearTiming);
    }

    vec3 col = vec3(0.1176, 0.1176, 0.1176);
    float alpha = 0.0;

    if (scale > 0.0) {
        float d = hexDist(gv);
        float hexagon = smoothstep(0.52, 0.5, d / scale);
        alpha = hexagon * scale;
    }

    // vec3 debugAnimeColor = vec3(sin(time) *2.0, cos(time) * 2.0, sin(time * 0.5) * 2.0);
    gl_FragColor = vec4(col, alpha);

        // デバッグ用: animationFlagの値を色で確認
    if (abs(animationFlag) < 0.1) {
        // animationFlag が 0 に近い場合は赤
        gl_FragColor = vec4(1.0, 0.0, 0.0, 0.3);
        return;
    } else if (animationFlag > 0.9) {
        // animationFlag が 1 に近い場合は緑
        gl_FragColor = vec4(0.0, 1.0, 0.0, 0.3);
        return;
    } else if (animationFlag < -0.9) {
        // animationFlag が -1 に近い場合は青
        gl_FragColor = vec4(0.0, 0.0, 1.0, 0.3);
        return;
    } else {
        // その他の値は黄色
        gl_FragColor = vec4(1.0, 1.0, 0.0, 0.3);
        return;
    }
}