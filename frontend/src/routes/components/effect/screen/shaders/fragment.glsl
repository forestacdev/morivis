#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

varying vec2 v_uv;
uniform vec2 resolution;
uniform float time;



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
    vec2 uv = (gl_FragCoord.xy - 0.5 * resolution.xy) / resolution.y;

    float baseScale = 6.0;
    uv *= baseScale;

    vec4 hc = hexCoords(uv);
    vec2 gv = hc.xy;
    vec2 id = hc.zw;

    // 右下からの距離を計算（修正：この変数が定義されていませんでした）
    float distFromBottomRight = length(id - vec2(5.0, -5.0));

    // --- ループアニメーション設定 ---
    float animationSpeed = 2.0;
    float delayPerUnitDist = 0.1;
    // 追加: アニメーションの各フェーズの長さを定義
    float appearDuration = 1.0;   // 出現アニメーションにかかる時間
    float holdDuration = 1.0;     // 表示されたまま待機する時間
    float disappearDuration = 1.0; // 消滅アニメーションにかかる時間
    // 1ループの合計時間
    float totalDuration = appearDuration + holdDuration + disappearDuration;

    // timeを1ループの時間で剰余をとり、周期的な時間loopTimeを生成
    float loopTime = mod(time, totalDuration);

    // --- スケール計算 ---

    // 1. 出現アニメーションの計算 (0から1へ)
    //   loopTimeが出現フェーズの間だけ進むように見せる
    float appearTiming = distFromBottomRight * delayPerUnitDist - loopTime * animationSpeed;
    float appearScale = smoothstep(0.0, -1.0, appearTiming);

    // 2. 消滅アニメーションの計算 (1から0へ)
    //   消滅フェーズの開始時間を計算
    float disappearStartTime = appearDuration + holdDuration;
    //   loopTimeが消滅フェーズに入ってからの経過時間を計算
    float disappearProgressTime = loopTime - disappearStartTime;

    float disappearTiming = distFromBottomRight * delayPerUnitDist - disappearProgressTime * animationSpeed;
    float disappearScale = 1.0 - smoothstep(0.0, -1.0, disappearTiming);

    // 3. 最終的なスケールを決定
    float scale = min(appearScale, disappearScale);

    // 背景色
    // 背景色（完全透過）
    vec3 col = vec3(0.1176, 0.1176, 0.1176); // ヘキサゴンの色のみ
    float alpha = 0.0;

    if (scale > 0.0) {
        float d = hexDist(gv);
        float hexagon = smoothstep(0.52, 0.5, d / scale);
        alpha = hexagon * scale; // ヘキサゴンの部分のみアルファ値を設定
    }

    gl_FragColor = vec4(col, alpha);
}


