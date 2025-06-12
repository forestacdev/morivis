
const float PI = 3.14159265359;
const float INV_PI = 1.0 / PI;
const float INV_TWO_PI = 1.0 / (2.0 * PI);

// X軸回りの3Dベクトル回転関数
vec3 rotateX(vec3 p, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    mat3 rotationMatrix = mat3(
        1.0, 0.0, 0.0,
        0.0, c,   -s,
        0.0, s,   c
    );
    return rotationMatrix * p;
}

// Y軸回りの3Dベクトル回転関数
vec3 rotateY(vec3 p, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    mat3 rotationMatrix = mat3(
        c,   0.0, s,
        0.0, 1.0, 0.0,
        -s,  0.0, c
    );
    return rotationMatrix * p;
}

// Z軸回りの3Dベクトル回転関数
vec3 rotateZ(vec3 p, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    mat3 rotationMatrix = mat3(
        c,   -s,  0.0,
        s,   c,   0.0,
        0.0, 0.0, 1.0
    );
    return rotationMatrix * p;
}


// 3D方向ベクトルをエクイレクタングラーUV座標に変換する関数
vec2 directionToEquirectangularUV(vec3 dir) {
    dir = normalize(dir);
    float u = atan(dir.x, dir.z) * INV_TWO_PI + 0.5;
    float v = asin(dir.y) * INV_PI + 0.5;
    return vec2(u, v);
}


uniform sampler2D textureA;
uniform sampler2D textureB;
uniform float fadeStartTime;
uniform float fadeSpeed;
uniform float time;
varying vec2 vUv;
varying vec3 v_modelPosition;
uniform vec3 rotationAngles;

void main() {
    vec3 samplingDirection = normalize(v_modelPosition);

            // サンプリング方向ベクトルをY軸周りに回転

    vec3 rotatedDirection = samplingDirection;
    rotatedDirection = rotateY(rotatedDirection, rotationAngles.y);
    rotatedDirection = rotateX(rotatedDirection, rotationAngles.z);
    rotatedDirection = rotateZ(rotatedDirection, rotationAngles.x);


    // 回転後の方向ベクトルをエクイレクタングラーUV座標に変換
    vec2 uv = directionToEquirectangularUV(rotatedDirection);
     // ★★★ U座標をここで反転 ★★★
    uv.x = 1.0 - uv.x;
    vec4 colorA = texture2D(textureA, uv);
    vec4 colorB = texture2D(textureB, uv);
    
    // フェード進行度を計算（0.0 = B表示、1.0 = A表示）
    float fadeProgress = (time - fadeStartTime) * fadeSpeed;
    fadeProgress = clamp(fadeProgress, 0.0, 1.0);
    
    // スムーズステップでより自然なフェード
    float smoothFade = smoothstep(0.0, 1.0, fadeProgress);
    
    // フェードが開始されていない場合（fadeStartTime <= 0.0）はAのみ表示
    float shouldFade = step(0.001, fadeStartTime);
    
    gl_FragColor = mix(colorA, mix(colorB, colorA, smoothFade), shouldFade);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}