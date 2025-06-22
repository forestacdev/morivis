#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
//uniform 変数としてテクスチャのデータを受け取る
uniform sampler2D u_texture;
// vertexShaderで処理されて渡されるテクスチャ座標
varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;
varying mat4 vModelMatrix;
uniform vec3 uColor;
uniform vec3 uColor2;
uniform float time;
varying mat4 v_modelMatrix;
varying float v_fogDistance;

uniform vec2 resolution; // 画面の解像度
uniform sampler2D uTexture; // テクスチャ
uniform vec2 uTextureResolution; // テクスチャの解像度

float edgeFactor(vec2 p){
    float thickness = 5.0;
    vec2 grid = abs(fract(p - 0.5) - 0.5) / fwidth(p) / thickness;
    return min(grid.x, grid.y);
}
void main(){

    // 画面からUV
   // 1. 基本となる画面UV
    vec2 screenUv = gl_FragCoord.xy / resolution.xy;

    // 2. 縦横比を計算
    float screenAspect = resolution.x / resolution.y;
    float textureAspect = uTextureResolution.x / uTextureResolution.y;

    // 3. 補正後のUVを入れる変数
    vec2 correctedUv = screenUv;

    // // 4. 縦横比に応じてUVを補正（Contain: レターボックス表示）
    // if (screenAspect > textureAspect) {
    //     // 画面がテクスチャより横長の場合 -> UVのX方向を補正
    //     correctedUv.x = (screenUv.x - 0.5) * (screenAspect / textureAspect) + 0.5;
    // } else {
    //     // 画面がテクスチャより縦長の場合 -> UVのY方向を補正
    //     correctedUv.y = (screenUv.y - 0.5) * (textureAspect / screenAspect) + 0.5;
    // }

    // // 5. テクスチャの範囲外(0.0-1.0)を黒くする（お好みで）
    // if (correctedUv.x < 0.0 || correctedUv.x > 1.0 || correctedUv.y < 0.0 || correctedUv.y > 1.0) {
    //     // discard; // または、ピクセルを破棄
    //     gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); // 黒く塗りつぶす
    //     return;
    // }

    // // 6. 補正したUVでテクスチャをサンプリング
    // vec4 texColor = texture2D(uTexture, correctedUv);

    // gl_FragColor = texColor;
    // return;


    //  float a = edgeFactor(vUv);

    //  フォッグの割合を計算 (線形補間)
    float fade = mod(time, 1.0); // u_timeを0〜1に正規化
    float fogFactor = smoothstep(0.0,300.0,  v_fogDistance);
    float fog_alpha = 1.0 - fogFactor; // フォッグが濃いほど透明に
    float coefficient = 1.2;
    float power = 1.0;
    vec3 glowColor = uColor;

    vec3 worldPosition = (vModelMatrix * vec4(vPosition, 1.0)).xyz;
    vec3 cameraToVertex = normalize(worldPosition - cameraPosition);
    float intensity = pow(coefficient + dot(cameraToVertex, normalize(vNormal)), power);

    // 等高線
    float contourInterval = 50.0; // 等高線の間隔
    float lineWidth = 6.0; // 等高線の線の幅
    float edgeWidth = 8.0; // 等高線の境界の幅（スムージング用）

    float t = time * 10.0;

    // 時間に基づいた変動を加えたY位置
    float yPos = vPosition.y - t;

    // 等高線の位置を計算
    float contourValue = mod(yPos, contourInterval);
    // 等高線のアルファ値を計算
    float alpha = smoothstep(lineWidth - edgeWidth, lineWidth, contourValue) - smoothstep(lineWidth, lineWidth + edgeWidth, contourValue);

    // 等高線の色
    vec3 contourColor = uColor2; // 赤色

    // 地形の色
    vec3 terrainColor = uColor; // グレー色

    // 等高線か地形かによって色を決定
    vec3 color = mix(terrainColor, contourColor, alpha);

    vec3 color2 = mix(color, glowColor, 0.5);


  

    // 法線ベクトルと「真上」方向（0,1,0）との角度を使って傾斜を検出
    float slope = 1.0 - dot(normalize(vNormal), vec3(0.0, 1.0, 0.0)); // 0 = 上向き, 1 = 横向き

    // 傾斜に応じたカラー補正（エッジが赤みを帯びるなど）
    vec3 slopeColor = mix(color2, vec3(0.0, 1.0, 0.898), pow(slope, .5)); // 傾斜が急なほどオレンジに近づく

    // fog + glow + contour + 傾斜
    gl_FragColor = vec4(slopeColor, fog_alpha) * intensity;


    // if(texColor.a != 0.0) {
    //     // アルファ値が低い場合は透明にする
    //       // gl_FragColor = vec4(color, fog_alpha - 1.0)  * intensity;
    //         gl_FragColor = vec4(vec3(slope), 1.0);
    // } 


}