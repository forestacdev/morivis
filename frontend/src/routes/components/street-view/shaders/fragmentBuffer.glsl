uniform sampler2D screenTexture;
varying vec2 vUv;

uniform vec2 resolution;
uniform vec2 screenCenter;
uniform float zoomBlurStrength;


void main() {
     vec3 color = vec3(0.0);
    float totalWeight = 0.0;

    // サンプル数（多いほど滑らかになるがパフォーマンスに影響）
    const int samples = 30;

    for (int i = 0; i < samples; i++) {
        float percent = float(i) / float(samples - 1); // サンプル間隔
        vec2 offset = vUv - screenCenter;             // 中心からのオフセット
        vec2 sampleUV = vUv - offset * percent * zoomBlurStrength; // 補間してサンプル座標を計算
        color += texture2D(screenTexture, sampleUV).rgb; // サンプルを取得
        totalWeight += 1.0;
    }

    // 平均化して最終色を計算
    color /= totalWeight;

    gl_FragColor = vec4(color, 1.0);

    // トーンマッピングと色空間変換を適用
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}