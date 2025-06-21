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
    vec2 uv = (gl_FragCoord.xy - 0.5 * resolution.xy) / resolution.y;

    float baseScale = 6.0;
    uv *= baseScale;

    vec4 hc = hexCoords(uv);
    vec2 gv = hc.xy;
    vec2 id = hc.zw;

    float distFromBottomRight = length(id - vec2(5.0, -5.0));

    float animationSpeed = 2.0;
    float delayPerUnitDist = 0.1;
    float appearDuration = 1.0;
    float disappearDuration = 1.0;

    float scale = 0.0;

    if (animationFlag > 0.5) {
        // 出現アニメーション (0から1へ)
        float appearTiming = distFromBottomRight * delayPerUnitDist - time * animationSpeed;
        scale = smoothstep(0.0, -1.0, appearTiming);
    } else if (animationFlag < -0.5) {
        // 消失アニメーション (1から0へ)
        float disappearTiming = distFromBottomRight * delayPerUnitDist - time * animationSpeed;
        scale = 1.0 - smoothstep(0.0, -1.0, disappearTiming);
    }

    vec3 col = vec3(0.1176, 0.1176, 0.1176);
    float alpha = 0.0;

    if (scale > 0.0) {
        float d = hexDist(gv);
        float hexagon = smoothstep(0.52, 0.5, d / scale);
        alpha = hexagon * scale;
    }

    gl_FragColor = vec4(col, alpha);
}


