(function(){"use strict";var f=`#version 300 es

in vec4 a_position;
void main() {
    gl_Position = a_position;
}`,u=`#version 300 es
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_imageResolution; // 画像の解像度
uniform sampler2D u_texture; // 画像テクスチャ

out vec4 outColor; // 出力する色

#define PI 3.14159265358979323846

// 円形マスク関数
float circleMask(vec2 _st, vec2 center, float radius) {
    float dist = length(_st - center);
    float edgeWidth = fwidth(dist) * 2.5;
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

// 点と線分の距離を計算
float sdSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

// 三角形のSDF近似（エッジからの最短距離）
float triangleEdgeDistance(vec2 p, vec2 p0, vec2 p1, vec2 p2) {
    float d0 = sdSegment(p, p0, p1);
    float d1 = sdSegment(p, p1, p2);
    float d2 = sdSegment(p, p2, p0);
    return min(min(d0, d1), d2);
}

// 円形シャドウマスク（マスク外側にだけ影を落とす）
float circleShadowMask(vec2 _st, vec2 center, float radius, float blur) {
    float dist = length(_st - center);
    return smoothstep(radius + blur, radius, dist); // 外→内に向かってfade
}

void main(void) {
    // 画像とキャンバスのアスペクト比
    float canvasAspect = u_resolution.x / u_resolution.y;
    float imageAspect = u_imageResolution.x / u_imageResolution.y;
    vec2 st = gl_FragCoord.xy / u_resolution.xy;

    // アスペクト比
    float aspect = u_resolution.x / u_resolution.y;

    // アスペクト補正あり（図形用）
    vec2 stForShape = st;
    stForShape.x *= aspect;
    // テクスチャ座標 yを反転
    vec2 texCoord = vec2(st.x, 1.0 - st.y);

    if (imageAspect > canvasAspect) {
        // 横長の画像：左右を削る
        float scale = canvasAspect / imageAspect;
        float offset = (1.0 - scale) / 2.0;
        texCoord.x = offset + texCoord.x * scale;
    } else {
        // 縦長の画像：上下を削る
        float scale = imageAspect / canvasAspect;
        float offset = (1.0 - scale) / 2.0;
        texCoord.y = offset + texCoord.y * scale;
    }

    vec2 center = vec2(0.5, 0.5);
    // アスペクト比を補正
    center.x *= aspect;

    // 円形マスクの設定
    float radius = 0.4;
    float mask = circleMask(stForShape, center, radius);

    // 白い縁の設定
    float borderThickness = 0.02; // 縁の太さを指定
    float outerMask = circleMask(stForShape, center, radius - borderThickness);

    // テクスチャから色をサンプリング
    vec4 textureColor = texture(u_texture, texCoord);

    // 初期の色とアルファを設定（画像と円を適用）
    vec3 color = textureColor.rgb; // 画像を最優先で描画
    float alpha = mask * textureColor.a;

    // 円の縁を白くする
    if (mask > 0.0 && outerMask < 1.0) {
        color = vec3(1.0);
        alpha = 1.0; // 円の縁は完全不透明
    }

    // 三角形の頂点を設定（下向き三角形）
    vec2 p0 = vec2(0.5 * aspect, 0.0);   // 画面中央下
    vec2 p1 = vec2(0.3 * aspect, 0.18);  // 左上
    vec2 p2 = vec2(0.7 * aspect, 0.18);  // 右上

    // 三角形内判定（ベース）
    // 三角形のマスク（ベース）
    float triangleBase = triangleMask(stForShape, p0, p1, p2);

    // エッジだけを滑らかにする
    float triangleDist = triangleEdgeDistance(stForShape, p0, p1, p2);
    float edgeWidth = max(fwidth(triangleDist), 1.0 / u_resolution.x) * 1.5;

    // 補間を適用して「エッジ部分だけ」滑らかに
    float triangleEdgeFade = smoothstep(edgeWidth, 0.0, triangleDist);
    float triangleAlpha = mix(triangleEdgeFade, 1.0, triangleBase);

    // 三角形部分を背景色として描画（画像より後ろにする）
    if (triangleAlpha > 0.0 && alpha == 0.0) {
        color = vec3(1.0);     // 三角形を白色で描画
        alpha = triangleAlpha; // フェード付きで不透明度調整
    }

    float shadowBlur = 0.04; // 影の広がり（大きいほど広くぼかす）
    float shadow = circleShadowMask(stForShape, center, radius, shadowBlur);

    // 影色（少し暗いグレー）をアルファ付きでブレンド
    if (alpha == 0.0 && shadow > 0.0) {
        color = mix(color, vec3(0.0), shadow * 9.9); // 影の濃さ：0.2
        alpha = shadow * 0.2;
    }

    outColor = vec4(color, alpha);
}`;const s=(t,o,a)=>{const n=t.createShader(o);return n?(t.shaderSource(n,a),t.compileShader(n),t.getShaderParameter(n,t.COMPILE_STATUS)?n:(console.error("Shader compilation failed:",t.getShaderInfoLog(n)),t.deleteShader(n),null)):null},p=(t,o,a)=>{const n=t.createProgram();return n?(t.attachShader(n,o),t.attachShader(n,a),t.linkProgram(n),t.getProgramParameter(n,t.LINK_STATUS)?n:(console.error("Program linking failed:",t.getProgramInfoLog(n)),t.deleteProgram(n),null)):null},i=new OffscreenCanvas(440,512),e=i.getContext("webgl2");self.onmessage=async t=>{const{id:o,image:a}=t.data;try{if(!e)return console.error("WebGL not supported"),new ImageBitmap;const n=s(e,e.VERTEX_SHADER,f),c=s(e,e.FRAGMENT_SHADER,u);if(!n||!c)return new ImageBitmap;const r=p(e,n,c);if(!r)return new ImageBitmap;e.useProgram(r);const l=e.getAttribLocation(r,"a_position"),v=e.getUniformLocation(r,"u_resolution"),m=e.getUniformLocation(r,"u_imageResolution");e.uniform2f(m,a.width,a.height);const h=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,h),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),e.STATIC_DRAW),e.enableVertexAttribArray(l),e.vertexAttribPointer(l,2,e.FLOAT,!1,0,0),e.uniform2f(v,i.width,i.height);const d=e.createTexture();e.bindTexture(e.TEXTURE_2D,d),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.bindTexture(e.TEXTURE_2D,d),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,a),e.drawArrays(e.TRIANGLES,0,6),self.postMessage({id:o,imageBitmap:i.transferToImageBitmap()})}catch(n){console.error(n)}}})();
